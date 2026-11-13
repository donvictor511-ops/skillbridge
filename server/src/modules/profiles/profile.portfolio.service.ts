import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import type { AuthUser } from "../auth/auth.types";
import { MAX_PROJECTS } from "./profile.options";
import type { BusinessInput, ProjectInput } from "./profile.portfolio.schema";
import { getOwnProfileId } from "./profile.sections.service";
import { getOwnerProfile } from "./profile.service";
import type { OwnerProfile } from "./profile.types";

export function projectNotFound(): AppError {
  return new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
}

// Every skill chosen for a project must be on the user's OWN skills list.
// This keeps the "proof" honest: a project can only demonstrate skills the
// person actually lists.
async function assertSkillsAreOwn(
  userId: string,
  skillIds: string[],
): Promise<void> {
  if (skillIds.length === 0) {
    return;
  }

  const owned = await prisma.userSkill.findMany({
    where: { userId, skillId: { in: skillIds } },
    select: { skillId: true },
  });

  if (owned.length !== skillIds.length) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Please check the highlighted fields.",
      [
        {
          field: "skillIds",
          message: "Choose skills from your own skills list.",
        },
      ],
    );
  }
}

// ------------------------------------------------------------------ projects

export async function addProject(
  userId: string,
  input: ProjectInput,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  const count = await prisma.portfolioProject.count({ where: { profileId } });
  if (count >= MAX_PROJECTS) {
    throw new AppError(
      409,
      "LIMIT_REACHED",
      `You can add up to ${MAX_PROJECTS} projects.`,
    );
  }

  await assertSkillsAreOwn(userId, input.skillIds);

  // One database call creates the project AND its skill links together.
  await prisma.portfolioProject.create({
    data: {
      profileId,
      title: input.title,
      description: input.description,
      projectUrl: input.projectUrl,
      imageUrl: input.imageUrl,
      skills: { create: input.skillIds.map((skillId) => ({ skillId })) },
    },
  });

  return getOwnerProfile(userId);
}

export async function replaceProject(
  userId: string,
  projectId: string,
  input: ProjectInput,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  // One transaction: ownership, validation and updates are atomic.
  await prisma.$transaction(async (tx) => {
    // FIRST: Check whether this project belongs to this user.
    const existingProject = await tx.portfolioProject.findFirst({
      where: { id: projectId, profileId },
      select: { id: true },
    });

    if (!existingProject) {
      throw projectNotFound();
    }

    // SECOND: Validate skills only after ownership is confirmed.
    await assertSkillsAreOwn(userId, input.skillIds);

    // THIRD: Update the project.
    const result = await tx.portfolioProject.updateMany({
      where: { id: projectId, profileId },
      data: {
        title: input.title,
        description: input.description,
        projectUrl: input.projectUrl,
        imageUrl: input.imageUrl,
      },
    });

    if (result.count === 0) {
      throw projectNotFound();
    }

    // FOURTH: Replace the project's skill links.
    await tx.portfolioProjectSkill.deleteMany({
      where: { projectId },
    });

    await tx.portfolioProjectSkill.createMany({
      data: input.skillIds.map((skillId) => ({
        projectId,
        skillId,
      })),
    });
  });

  return getOwnerProfile(userId);
}

export async function removeProject(
  userId: string,
  projectId: string,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  // The skill links are deleted automatically (cascade).
  const result = await prisma.portfolioProject.deleteMany({
    where: { id: projectId, profileId },
  });

  if (result.count === 0) {
    throw projectNotFound();
  }

  return getOwnerProfile(userId);
}

// ------------------------------------------------------------------- company

export async function saveBusiness(
  user: AuthUser,
  input: BusinessInput,
): Promise<OwnerProfile> {
  // Authorization by account type. "user" comes from the SESSION, so a client
  // cannot claim a capability by sending a field.
  if (!user.capabilities.includes("client")) {
    throw new AppError(
      403,
      "NOT_A_BUSINESS_ACCOUNT",
      "Only client or business accounts can add company details.",
    );
  }

  await getOwnProfileId(user.id);

  // "Upsert": update the row if it exists, otherwise create it.
  await prisma.businessProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...input },
    update: input,
  });

  return getOwnerProfile(user.id);
}

export async function removeBusiness(userId: string): Promise<OwnerProfile> {
  await getOwnProfileId(userId);

  // Deleting your OWN data is always allowed.
  await prisma.businessProfile.deleteMany({ where: { userId } });

  return getOwnerProfile(userId);
}
