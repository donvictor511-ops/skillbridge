import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { authUserSelect } from "../auth/auth.types";
import type { AuthUser } from "../auth/auth.types";
import { uniqueSkills } from "../skills/skill.utils";
import type { OnboardingInput } from "./onboarding.schema";

export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
): Promise<AuthUser> {
  const skills = uniqueSkills(input.skills);

  // A transaction: everything inside succeeds together, or nothing is saved.
  return prisma.$transaction(async (tx) => {
    // "Claim" onboarding. This only changes a row if onboarded_at is still
    // empty. If two requests arrive together, only ONE can claim it.
    const claimed = await tx.user.updateMany({
      where: { id: userId, onboardedAt: null },
      data: { capabilities: input.capabilities, onboardedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw new AppError(
        409,
        "ONBOARDING_ALREADY_COMPLETED",
        "Your account setup is already complete.",
      );
    }

    const profile = await tx.profile.create({
      data: {
        userId,
        displayName: input.displayName,
        headline: input.headline,
        location: input.location,
        avatarUrl: input.avatarUrl ?? null,
        interests: input.interests,
        goals: input.goals,
      },
      select: { id: true },
    });

    const skillIdsByKey = new Map<string, string>();
    for (const skill of skills) {
      // Find the skill by its lowercase key, or create it. Skills are shared:
      // two people typing "React" end up pointing at the SAME skill row.
      const saved = await tx.skill.upsert({
        where: { nameKey: skill.nameKey },
        create: { name: skill.name, nameKey: skill.nameKey },
        update: {},
        select: { id: true },
      });

      await tx.userSkill.create({ data: { userId, skillId: saved.id } });
      skillIdsByKey.set(skill.nameKey, saved.id);
    }

    if (input.project) {
      const projectSkillIds = uniqueSkills(input.project.skills)
        .map((skill) => skillIdsByKey.get(skill.nameKey))
        .filter((id): id is string => id !== undefined);

      await tx.portfolioProject.create({
        data: {
          profileId: profile.id,
          title: input.project.title,
          description: input.project.description,
          projectUrl: input.project.projectUrl,
          skills: { create: projectSkillIds.map((skillId) => ({ skillId })) },
        },
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: authUserSelect,
    });
  });
}
