import { prisma } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type { PresenceStore } from "./presence.service";

async function lockUser(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}

export const prismaPresenceStore: PresenceStore = {
  async connect(sessionId, userId, now, staleBefore) {
    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const wasOnline = Boolean(await tx.presenceSession.findFirst({
        where: { userId, lastSeenAt: { gt: staleBefore } },
        select: { id: true },
      }));
      await tx.presenceSession.create({ data: { id: sessionId, userId, lastSeenAt: now } });
      return !wasOnline;
    });
  },

  async heartbeat(sessionId, userId, now) {
    const result = await prisma.presenceSession.updateMany({
      where: { id: sessionId, userId },
      data: { lastSeenAt: now },
    });
    return result.count > 0;
  },

  async disconnect(sessionId, staleBefore) {
    const existing = await prisma.presenceSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
    if (!existing) return null;

    return prisma.$transaction(async (tx) => {
      await lockUser(tx, existing.userId);
      const removed = await tx.presenceSession.deleteMany({ where: { id: sessionId, userId: existing.userId } });
      if (!removed.count) return null;
      const remaining = await tx.presenceSession.findFirst({
        where: { userId: existing.userId, lastSeenAt: { gt: staleBefore } },
        select: { id: true },
      });
      return remaining ? null : existing.userId;
    });
  },

  async onlineUserIds(userIds, staleBefore) {
    if (!userIds.length) return [];
    const sessions = await prisma.presenceSession.findMany({
      where: { userId: { in: userIds }, lastSeenAt: { gt: staleBefore } },
      distinct: ["userId"],
      select: { userId: true },
    });
    return sessions.map((session) => session.userId);
  },

  async expireStale(staleBefore) {
    const staleUsers = await prisma.presenceSession.findMany({
      where: { lastSeenAt: { lte: staleBefore } },
      distinct: ["userId"],
      select: { userId: true },
    });
    const newlyOffline: string[] = [];

    for (const { userId } of staleUsers) {
      const becameOffline = await prisma.$transaction(async (tx) => {
        await lockUser(tx, userId);
        const removed = await tx.presenceSession.deleteMany({ where: { userId, lastSeenAt: { lte: staleBefore } } });
        if (!removed.count) return false;
        const remaining = await tx.presenceSession.findFirst({
          where: { userId, lastSeenAt: { gt: staleBefore } },
          select: { id: true },
        });
        return !remaining;
      });
      if (becameOffline) newlyOffline.push(userId);
    }

    return newlyOffline;
  },
};
