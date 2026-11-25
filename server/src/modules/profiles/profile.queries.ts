import { prisma } from "../../db/prisma";
import type {
  OwnerProfile,
  ProfileBusiness,
  ProfileProject,
  ProfileSkill,
  PublicProfile,
} from "./profile.types";

// ONE query that loads everything a profile page needs. The explicit "select"
// lists every column we are willing to read. Note what is NOT here: the
// user's email, password hash, and sessions.
async function findProfileRow(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
    select: {
      userId: true,
      displayName: true,
      headline: true,
      location: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      visibility: true,
      interests: true,
      goals: true,
      spokenLanguages: true,
      allowCommunityInvites: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          createdAt: true,
          capabilities: true,
          skills: { select: { skill: { select: { id: true, name: true } } } },
          businessProfile: {
            select: {
              companyName: true,
              websiteUrl: true,
              industry: true,
              sizeRange: true,
              about: true,
            },
          },
        },
      },
      // Current jobs (no end date) first, then the most recent.
      experiences: {
        orderBy: [{ endDate: "desc" }, { startDate: "desc" }],
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          startDate: true,
          endDate: true,
          description: true,
        },
      },
      educationEntries: {
        orderBy: [{ endYear: "desc" }, { startYear: "desc" }],
        select: {
          id: true,
          school: true,
          degree: true,
          fieldOfStudy: true,
          startYear: true,
          endYear: true,
          description: true,
        },
      },
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          projectUrl: true,
          imageUrl: true,
          skills: { select: { skill: { select: { id: true, name: true } } } },
        },
      },
    },
  });
}

// The exact shape of one loaded profile.
export type ProfileRow = NonNullable<
  Awaited<ReturnType<typeof findProfileRow>>
>;

export { findProfileRow };

// The database stores business size as named values. We show friendly labels.
const SIZE_RANGE_LABELS: Record<string, string> = {
  size_1_10: "1-10",
  size_11_50: "11-50",
  size_51_200: "51-200",
  size_201_500: "201-500",
  size_501_plus: "501+",
};

// A date-only column comes back as a Date at midnight UTC. We send YYYY-MM-DD.
function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

// Turns a database row into the PUBLIC response. Only listed fields get out.
export function toPublicProfile(
  row: ProfileRow,
  social: { connectionCount: number; followerCount: number; followingCount: number; isFollowing: boolean },
): PublicProfile {
  const projects: ProfileProject[] = row.projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    projectUrl: project.projectUrl,
    imageUrl: project.imageUrl,
    skills: project.skills.map((link) => link.skill).sort(byName),
  }));

  // For each skill, count the projects that use it. This is the "proof".
  const projectCounts = new Map<string, number>();
  for (const project of projects) {
    for (const skill of project.skills) {
      projectCounts.set(skill.id, (projectCounts.get(skill.id) ?? 0) + 1);
    }
  }

  const skills: ProfileSkill[] = row.user.skills
    .map((link) => ({
      id: link.skill.id,
      name: link.skill.name,
      projectCount: projectCounts.get(link.skill.id) ?? 0,
    }))
    .sort(byName);

  // A business profile is only shown for accounts with the client capability.
  const businessRow = row.user.businessProfile;
  const business: ProfileBusiness | null =
    businessRow && row.user.capabilities.includes("client")
      ? {
          companyName: businessRow.companyName,
          websiteUrl: businessRow.websiteUrl,
          industry: businessRow.industry,
          sizeRange: businessRow.sizeRange
            ? (SIZE_RANGE_LABELS[businessRow.sizeRange] ??
              businessRow.sizeRange)
            : null,
          about: businessRow.about,
        }
      : null;

  return {
    userId: row.userId,
    joinedAt: row.user.createdAt.toISOString(),
    ...social,
    displayName: row.displayName,
    headline: row.headline,
    location: row.location,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    accountTypes: row.user.capabilities,
    interests: row.interests,
    spokenLanguages: row.spokenLanguages,
    skills,
    experiences: row.experiences.map((experience) => ({
      id: experience.id,
      title: experience.title,
      company: experience.company,
      location: experience.location,
      startDate: toDateOnly(experience.startDate),
      endDate: experience.endDate ? toDateOnly(experience.endDate) : null,
      description: experience.description,
    })),
    education: row.educationEntries.map((entry) => ({
      id: entry.id,
      school: entry.school,
      degree: entry.degree,
      fieldOfStudy: entry.fieldOfStudy,
      startYear: entry.startYear,
      endYear: entry.endYear,
      description: entry.description,
    })),
    projects,
    business,
  };
}

// The OWNER sees everything public, plus the private parts.
// The OWNER sees everything public, plus the private parts.
export function toOwnerProfile(
  row: ProfileRow,
  social: { connectionCount: number; followerCount: number; followingCount: number; isFollowing: boolean },
): OwnerProfile {
  return {
    ...toPublicProfile(row, social),
    visibility: row.visibility,
    goals: row.goals,
    allowCommunityInvites: row.allowCommunityInvites,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
