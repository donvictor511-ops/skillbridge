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

  return prisma.follow.upsert({
    where: { followerId_followedId: { followerId, followedId } },
    create: { followerId, followedId },
    update: {},
    select: { followerId: true, followedId: true, createdAt: true },
  });
}

export async function unfollowUser(followerId: string, followedId: string): Promise<void> {
  await prisma.follow.deleteMany({ where: { followerId, followedId } });
}
