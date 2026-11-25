import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import type { AuthUser } from "../auth/auth.types";
import { uniqueSkills } from "../skills/skill.utils";
import { decideProfileAccess } from "./profile.access";
import {
  findProfileRow,
  toOwnerProfile,
  toPublicProfile,
} from "./profile.queries";
import type { UpdateProfileInput } from "./profile.schema";
import type { OwnerProfile, PublicProfile } from "./profile.types";
import { usersHaveBlockedEachOther } from "./profile.blocking";

export function profileNotFound(): AppError {
  return new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
}

async function getSocialCounts(userId: string, viewerId?: string) {
  const [connectionCount, followerCount, followingCount, relationship] = await Promise.all([
    prisma.connection.count({ where: { status: "accepted", OR: [{ userLowId: userId }, { userHighId: userId }] } }),
    prisma.follow.count({ where: { followedId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    viewerId && viewerId !== userId
      ? prisma.follow.findUnique({ where: { followerId_followedId: { followerId: viewerId, followedId: userId } }, select: { followerId: true } })
      : Promise.resolve(null),
  ]);
  return { connectionCount, followerCount, followingCount, isFollowing: relationship !== null };
}

// P2025 is Prisma's code for "the record to update does not exist".
function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}

// Your own profile, with private fields.
export async function getOwnerProfile(userId: string): Promise<OwnerProfile> {
  const row = await findProfileRow(userId);

  if (!row) {
    throw profileNotFound();
  }

  const social = await getSocialCounts(userId);

  return toOwnerProfile(row, social);
}

// Someone's profile as the CURRENT VISITOR is allowed to see it.
// "viewer" is undefined for a logged-out visitor.
export async function getProfileForViewer(
  targetUserId: string,
  viewer: AuthUser | undefined,
): Promise<PublicProfile> {
  const row = await findProfileRow(targetUserId);

  if (!row) {
    throw profileNotFound();
  }

  if (
    viewer &&
    viewer.id !== targetUserId &&
    (await usersHaveBlockedEachOther(viewer.id, targetUserId))
  ) {
    throw profileNotFound();
  }

  const access = decideProfileAccess(
    row.visibility,
    viewer?.id === row.userId,
    viewer !== undefined,
  );

  if (access === "not_found") {
    throw profileNotFound();
  }

  if (access === "login_required") {
    throw new AppError(401, "LOGIN_REQUIRED", "Log in to view this profile.");
  }

  // The public shape is used even when the owner views their own page here.
  const social = await getSocialCounts(targetUserId, viewer?.id);

  return toPublicProfile(row, social);
}

// Updates the basics of the CURRENT USER's profile. The user id comes from the
// session. Fields left out are unchanged (Prisma ignores undefined).
export async function updateProfileBasics(
  userId: string,
  input: UpdateProfileInput,
): Promise<OwnerProfile> {
  try {
    await prisma.profile.update({ where: { userId }, data: input });
  } catch (error: unknown) {
    if (isRecordNotFoundError(error)) {
      throw profileNotFound();
    }
    throw error;
  }

  return getOwnerProfile(userId);
}

// Replaces the CURRENT USER's whole skills list with the given names.
export async function replaceUserSkills(
  userId: string,
  names: string[],
): Promise<OwnerProfile> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw profileNotFound();
  }

  const skills = uniqueSkills(names);

  // One transaction: the list is replaced completely, or not at all.
  await prisma.$transaction(async (tx) => {
    const skillIds: string[] = [];

    for (const skill of skills) {
      const saved = await tx.skill.upsert({
        where: { nameKey: skill.nameKey },
        create: { name: skill.name, nameKey: skill.nameKey },
        update: {},
        select: { id: true },
      });
      skillIds.push(saved.id);
    }

    // Remove skills that are no longer in the list.
    await tx.userSkill.deleteMany({
      where: { userId, skillId: { notIn: skillIds } },
    });

    // A skill you no longer list can no longer be "proven" by a project of
    // yours, so remove those project links too.
    await tx.portfolioProjectSkill.deleteMany({
      where: {
        skillId: { notIn: skillIds },
        project: { profile: { userId } },
      },
    });

    // Add the new ones.
    await tx.userSkill.createMany({
      data: skillIds.map((skillId) => ({ userId, skillId })),
      skipDuplicates: true,
    });
  });

  return getOwnerProfile(userId);
}
