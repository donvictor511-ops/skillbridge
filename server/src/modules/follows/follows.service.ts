import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { usersHaveBlockedEachOther } from "../profiles/profile.blocking";

export async function followUser(followerId: string, followedId: string) {
  if (followerId === followedId) {
    throw new AppError(400, "SELF_FOLLOW", "You cannot follow yourself.");
  }
  if (await usersHaveBlockedEachOther(followerId, followedId)) {
    throw new AppError(404, "USER_NOT_AVAILABLE", "This user is not available to follow.");
  }

  const target = await prisma.user.findUnique({
    where: { id: followedId },
    select: { onboardedAt: true, profile: { select: { visibility: true } } },
  });
  if (!target?.onboardedAt || !target.profile || target.profile.visibility === "private") {
    throw new AppError(404, "USER_NOT_AVAILABLE", "This user is not available to follow.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const follow = await tx.follow.create({
        data: { followerId, followedId },
        select: { followerId: true, followedId: true, createdAt: true },
      });

      await tx.notification.create({
        data: {
          recipientId: followedId,
          actorId: followerId,
          type: "follow",
          message: "started following you.",
        },
      });

      return follow;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return prisma.follow.findUniqueOrThrow({
        where: { followerId_followedId: { followerId, followedId } },
        select: { followerId: true, followedId: true, createdAt: true },
      });
    }
    throw error;
  }
}

export async function unfollowUser(followerId: string, followedId: string): Promise<void> {
  await prisma.follow.deleteMany({ where: { followerId, followedId } });
}
