import { prisma } from "../../db/prisma";

export function usersHaveBlockedEachOther(firstUserId: string, secondUserId: string) {
  return prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: firstUserId, blockedId: secondUserId },
        { blockerId: secondUserId, blockedId: firstUserId },
      ],
    },
    select: { blockerId: true },
  });
}
