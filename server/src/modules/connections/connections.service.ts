import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import type { ConnectionListQuery } from "./connections.schema";
import { usersHaveBlockedEachOther } from "../profiles/profile.blocking";
import { getMutualConnectionCounts } from "./mutualConnections";

function getUserPair(firstId: string, secondId: string) {
  const first = firstId.toLowerCase();
  const second = secondId.toLowerCase();

  return first < second
    ? { userLowId: first, userHighId: second }
    : { userLowId: second, userHighId: first };
}

export async function sendConnectionRequest(
  requesterId: string,
  recipientId: string,
) {
  if (requesterId === recipientId) {
    throw new AppError(
      400,
      "SELF_CONNECTION",
      "You cannot send a connection request to yourself.",
    );
  }

  if (await usersHaveBlockedEachOther(requesterId, recipientId)) {
    throw new AppError(404, "USER_NOT_AVAILABLE", "This user is not available for connections.");
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: {
      id: true,
      onboardedAt: true,
      profile: {
        select: {
          visibility: true,
        },
      },
    },
  });

  if (
    !recipient ||
    !recipient.onboardedAt ||
    !recipient.profile ||
    recipient.profile.visibility === "private"
  ) {
    throw new AppError(
      404,
      "USER_NOT_AVAILABLE",
      "This user is not available for connections.",
    );
  }

  const pair = getUserPair(requesterId, recipientId);

  const existing = await prisma.connection.findUnique({
    where: {
      userLowId_userHighId: pair,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existing) {
    throw new AppError(
      409,
      "CONNECTION_EXISTS",
      existing.status === "accepted"
        ? "You are already connected."
        : existing.status === "pending"
          ? "A connection request already exists."
          : "A previous connection request was rejected.",
    );
  }

  try {
    const connection = await prisma.$transaction(async (tx) => {
      const createdConnection = await tx.connection.create({
        data: {
          ...pair,
          requestedById: requesterId,
        },
        select: {
          id: true,
          status: true,
          requestedById: true,
          createdAt: true,
        },
      });

      await tx.notification.create({
        data: {
          recipientId,
          actorId: requesterId,
          type: "connection_request",
          message: "You received a connection request.",
          resourceId: createdConnection.id,
        },
      });

      return createdConnection;
    });

    return connection;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "CONNECTION_EXISTS",
        "A connection request already exists.",
      );
    }

    throw error;
  }
}

export async function listConnections(
  userId: string,
  query: ConnectionListQuery,
) {
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId);
  const where: Prisma.ConnectionWhereInput = {
    OR: [{ userLowId: userId }, { userHighId: userId }],
    ...(blockedIds.length ? { NOT: [{ userLowId: userId, userHighId: { in: blockedIds } }, { userHighId: userId, userLowId: { in: blockedIds } }] } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const connections = await prisma.connection.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      requestedById: true,
      createdAt: true,
      updatedAt: true,
      userLowId: true,
      userHighId: true,
      userLow: {
        select: {
          profile: {
            select: {
              displayName: true,
              headline: true,
              location: true,
              avatarUrl: true,
            },
          },
        },
      },
      userHigh: {
        select: {
          profile: {
            select: {
              displayName: true,
              headline: true,
              location: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  const acceptedTargetIds = connections.filter((connection) => connection.status === "accepted").map((connection) => connection.userLowId === userId ? connection.userHighId : connection.userLowId);
  const mutualCounts = await getMutualConnectionCounts(userId, acceptedTargetIds);

  return connections.map((connection) => {
    const isLowUser = connection.userLowId === userId;
    const otherProfile = isLowUser
      ? connection.userHigh.profile
      : connection.userLow.profile;

    return {
      id: connection.id,
      status: connection.status,
      direction: connection.requestedById === userId ? "outgoing" : "incoming",
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      user: {
        userId: isLowUser ? connection.userHighId : connection.userLowId,
        displayName: otherProfile?.displayName ?? "Unavailable profile",
        headline: otherProfile?.headline ?? null,
        location: otherProfile?.location ?? null,
        avatarUrl: otherProfile?.avatarUrl ?? null,
        mutualConnectionCount: mutualCounts.get(isLowUser ? connection.userHighId : connection.userLowId) ?? 0,
      },
    };
  });
}

export async function respondToConnectionRequest(
  userId: string,
  connectionId: string,
  status: "accepted" | "rejected",
) {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      requestedById: true,
      userLowId: true,
      userHighId: true,
      status: true,
    },
  });

  if (
    !connection ||
    (connection.userLowId !== userId && connection.userHighId !== userId)
  ) {
    throw new AppError(
      404,
      "CONNECTION_NOT_FOUND",
      "Connection request not found.",
    );
  }

  if (connection.requestedById === userId) {
    throw new AppError(
      403,
      "NOT_REQUEST_RECIPIENT",
      "You cannot respond to a request you sent.",
    );
  }

  if (connection.status !== "pending") {
    throw new AppError(
      409,
      "REQUEST_NOT_PENDING",
      "This connection request has already been handled.",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.connection.updateMany({
      where: {
        id: connectionId,
        status: "pending",
        requestedById: { not: userId },
      },
      data: { status },
    });

    if (updated.count !== 1) {
      throw new AppError(
        409,
        "REQUEST_ALREADY_HANDLED",
        "This connection request has already been handled.",
      );
    }

    // Notify the original requester only when their request is accepted.
    if (status === "accepted") {
      await tx.notification.create({
        data: {
          recipientId: connection.requestedById,
          actorId: userId,
          type: "connection_accepted",
          message: "Your connection request was accepted.",
          resourceId: connectionId,
        },
      });
    }

    return tx.connection.findUniqueOrThrow({
      where: { id: connectionId },
      select: {
        id: true,
        status: true,
        requestedById: true,
        updatedAt: true,
      },
    });
  });

  return result;
}

export async function removeConnection(userId: string, connectionId: string) {
  const result = await prisma.connection.deleteMany({
    where: {
      id: connectionId,
      OR: [{ userLowId: userId }, { userHighId: userId }],
    },
  });

  if (result.count !== 1) {
    throw new AppError(404, "CONNECTION_NOT_FOUND", "Connection not found.");
  }
}
