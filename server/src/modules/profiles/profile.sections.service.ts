import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { MAX_EDUCATION_ENTRIES, MAX_EXPERIENCES } from "./profile.options";
import type {
  EducationInput,
  ExperienceInput,
} from "./profile.sections.schema";
import { getOwnerProfile, profileNotFound } from "./profile.service";
import type { OwnerProfile } from "./profile.types";

export function experienceNotFound(): AppError {
  return new AppError(
    404,
    "EXPERIENCE_NOT_FOUND",
    "Experience entry not found.",
  );
}

export function educationNotFound(): AppError {
  return new AppError(404, "EDUCATION_NOT_FOUND", "Education entry not found.");
}

// The id of the profile that belongs to the logged-in user. Everything below
// is scoped to THIS profile, so nobody can touch someone else's entries.
export async function getOwnProfileId(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw profileNotFound();
  }

  return profile.id;
}

// ---------------------------------------------------------------- experience

export async function addExperience(
  userId: string,
  input: ExperienceInput,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  const count = await prisma.experience.count({ where: { profileId } });
  if (count >= MAX_EXPERIENCES) {
    throw new AppError(
      409,
      "LIMIT_REACHED",
      `You can add up to ${MAX_EXPERIENCES} experience entries.`,
    );
  }

  await prisma.experience.create({ data: { profileId, ...input } });

  return getOwnerProfile(userId);
}

export async function replaceExperience(
  userId: string,
  experienceId: string,
  input: ExperienceInput,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  // Ownership is part of the WHERE: only a row with this id AND this profile
  // can change. If it is someone else's, zero rows change.
  const result = await prisma.experience.updateMany({
    where: { id: experienceId, profileId },
    data: input,
  });

  if (result.count === 0) {
    throw experienceNotFound();
  }

  return getOwnerProfile(userId);
}

export async function removeExperience(
  userId: string,
  experienceId: string,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  const result = await prisma.experience.deleteMany({
    where: { id: experienceId, profileId },
  });

  if (result.count === 0) {
    throw experienceNotFound();
  }

  return getOwnerProfile(userId);
}

// ----------------------------------------------------------------- education

export async function addEducation(
  userId: string,
  input: EducationInput,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  const count = await prisma.educationEntry.count({ where: { profileId } });
  if (count >= MAX_EDUCATION_ENTRIES) {
    throw new AppError(
      409,
      "LIMIT_REACHED",
      `You can add up to ${MAX_EDUCATION_ENTRIES} education entries.`,
    );
  }

  await prisma.educationEntry.create({ data: { profileId, ...input } });

  return getOwnerProfile(userId);
}

export async function replaceEducation(
  userId: string,
  educationId: string,
  input: EducationInput,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  const result = await prisma.educationEntry.updateMany({
    where: { id: educationId, profileId },
    data: input,
  });

  if (result.count === 0) {
    throw educationNotFound();
  }

  return getOwnerProfile(userId);
}

export async function removeEducation(
  userId: string,
  educationId: string,
): Promise<OwnerProfile> {
  const profileId = await getOwnProfileId(userId);

  const result = await prisma.educationEntry.deleteMany({
    where: { id: educationId, profileId },
  });

  if (result.count === 0) {
    throw educationNotFound();
  }

  return getOwnerProfile(userId);
}
