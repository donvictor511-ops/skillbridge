import { prisma } from "../../db/prisma";

export async function listPresencePeerIds(userId: string): Promise<string[]> {
  const [connections, conversations] = await Promise.all([
    prisma.connection.findMany({
      where: { status: "accepted", OR: [{ userLowId: userId }, { userHighId: userId }] },
      select: { userLowId: true, userHighId: true },
    }),
    prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      select: { userLowId: true, userHighId: true },
    }),
  ]);

  return [...new Set([
    ...connections.map(({ userLowId, userHighId }) => userLowId === userId ? userHighId : userLowId),
    ...conversations.map(({ userLowId, userHighId }) => userLowId === userId ? userHighId : userLowId),
  ])];
}
