import { prisma } from "../../db/prisma";

export async function getMutualConnectionCounts(viewerId: string, targetIds: string[]): Promise<Map<string, number>> {
  const counts = new Map(targetIds.map((id) => [id, 0]));
  if (!targetIds.length) return counts;

  const ownConnections = await prisma.connection.findMany({
    where: { status: "accepted", OR: [{ userLowId: viewerId }, { userHighId: viewerId }] },
    select: { userLowId: true, userHighId: true },
  });
  const networkIds = new Set(ownConnections.map((edge) => edge.userLowId === viewerId ? edge.userHighId : edge.userLowId));
  if (!networkIds.size) return counts;

  const edges = await prisma.connection.findMany({
    where: {
      status: "accepted",
      OR: [
        { userLowId: { in: [...networkIds] }, userHighId: { in: targetIds } },
        { userHighId: { in: [...networkIds] }, userLowId: { in: targetIds } },
      ],
    },
    select: { userLowId: true, userHighId: true },
  });
  const mutualIdsByTarget = new Map(targetIds.map((id) => [id, new Set<string>()]));
  for (const edge of edges) {
    if (networkIds.has(edge.userLowId) && mutualIdsByTarget.has(edge.userHighId)) mutualIdsByTarget.get(edge.userHighId)?.add(edge.userLowId);
    if (networkIds.has(edge.userHighId) && mutualIdsByTarget.has(edge.userLowId)) mutualIdsByTarget.get(edge.userLowId)?.add(edge.userHighId);
  }
  const allMutualIds = [...new Set([...mutualIdsByTarget.values()].flatMap((ids) => [...ids]))];
  if (!allMutualIds.length) return counts;

  const visibleProfiles = await prisma.profile.findMany({
    where: { userId: { in: allMutualIds }, visibility: { in: ["public", "members"] } },
    select: { userId: true },
  });
  const visibleIds = new Set(visibleProfiles.map((profile) => profile.userId));
  for (const [targetId, ids] of mutualIdsByTarget) counts.set(targetId, [...ids].filter((id) => visibleIds.has(id)).length);
  return counts;
}
