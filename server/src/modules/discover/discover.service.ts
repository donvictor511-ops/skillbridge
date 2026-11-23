import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import type { DiscoverQuery } from "./discover.schema";
import { getMutualConnectionCounts } from "../connections/mutualConnections";

export async function discoverProfiles(viewerId: string, query: DiscoverQuery) {
  const { search, skill, location, accountType, networkStatus, page, limit } = query;

  // Explicitly type all filters so Prisma's QueryMode is preserved.
  const filters: Prisma.ProfileWhereInput[] = [];

  if (location) {
    filters.push({
      location: {
        contains: location,
        mode: "insensitive",
      },
    });
  }

  if (skill) {
    filters.push({
      user: {
        is: {
          skills: {
            some: {
              skill: {
                is: {
                  name: {
                    contains: skill,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  if (search) {
    filters.push({
      OR: [
        {
          displayName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          headline: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          bio: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          user: {
            is: {
              skills: {
                some: {
                  skill: {
                    is: {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  const networkFilter: Prisma.UserWhereInput = networkStatus === "connected"
    ? { OR: [{ connectionsLow: { some: { userHighId: viewerId, status: "accepted" } } }, { connectionsHigh: { some: { userLowId: viewerId, status: "accepted" } } }] }
    : networkStatus === "pending"
      ? { OR: [{ connectionsLow: { some: { userHighId: viewerId, status: "pending" } } }, { connectionsHigh: { some: { userLowId: viewerId, status: "pending" } } }] }
      : networkStatus === "not_connected"
        ? { connectionsLow: { none: { userHighId: viewerId } }, connectionsHigh: { none: { userLowId: viewerId } } }
        : {};

  const where: Prisma.ProfileWhereInput = {
    userId: { not: viewerId },
    visibility: { in: ["public", "members"] },

    user: {
      is: {
        onboardedAt: { not: null },
        blocksMade: { none: { blockedId: viewerId } },
        blocksReceived: { none: { blockerId: viewerId } },
        ...(accountType ? { capabilities: { has: accountType } } : {}),
        ...networkFilter,
      },
    },

    AND: filters,
  };

  const skip = (page - 1) * limit;

  const [total, profiles] = await prisma.$transaction([
    prisma.profile.count({ where }),

    prisma.profile.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { displayName: "asc" }],
      skip,
      take: limit,
      select: {
        userId: true,
        displayName: true,
        headline: true,
        location: true,
        avatarUrl: true,
        user: {
          select: {
            capabilities: true,
            skills: {
              select: {
                skill: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    profiles: profiles.map((profile) => ({
      userId: profile.userId,
      displayName: profile.displayName,
      headline: profile.headline,
      location: profile.location,
      avatarUrl: profile.avatarUrl,
      accountTypes: profile.user.capabilities,
      skills: profile.user.skills.map(({ skill }) => skill),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function recommendProfiles(viewerId: string) {
  const viewer = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: {
      location: true,
      interests: true,
      goals: true,
      user: {
        select: {
          skills: { select: { skill: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!viewer) return { recommendations: [] };

  const profiles = await prisma.profile.findMany({
    where: {
      userId: { not: viewerId }, visibility: { in: ["public", "members"] },
      user: { is: {
        onboardedAt: { not: null },
        blocksMade: { none: { blockedId: viewerId } },
        blocksReceived: { none: { blockerId: viewerId } },
        connectionsLow: { none: { userHighId: viewerId } },
        connectionsHigh: { none: { userLowId: viewerId } },
      } },
    },
    orderBy: [{ updatedAt: "desc" }, { displayName: "asc" }], take: 120,
    select: {
      userId: true, displayName: true, headline: true, location: true, avatarUrl: true,
      interests: true, goals: true,
      user: { select: { capabilities: true, skills: { select: { skill: { select: { id: true, name: true } } } } } },
    },
  });
  const mutualCounts = await getMutualConnectionCounts(viewerId, profiles.map((profile) => profile.userId));
  const viewerSkillIds = new Set(viewer.user.skills.map(({ skill }) => skill.id));
  const viewerSkillNames = new Map(viewer.user.skills.map(({ skill }) => [skill.id, skill.name]));
  const viewerTopics = new Set([...viewer.interests, ...viewer.goals].map((item) => item.toLocaleLowerCase().trim()).filter(Boolean));
  const normalizedLocation = viewer.location?.toLocaleLowerCase().trim();

  const recommendations = profiles.map((profile) => {
    const sharedSkills = profile.user.skills.map(({ skill }) => skill).filter((skill) => viewerSkillIds.has(skill.id)).map((skill) => viewerSkillNames.get(skill.id) ?? skill.name);
    const sharedTopics = [...profile.interests, ...profile.goals].filter((item) => viewerTopics.has(item.toLocaleLowerCase().trim()));
    const mutualConnectionCount = mutualCounts.get(profile.userId) ?? 0;
    const sameLocation = Boolean(normalizedLocation && profile.location?.toLocaleLowerCase().trim() === normalizedLocation);
    const score = sharedSkills.length * 8 + sharedTopics.length * 5 + mutualConnectionCount * 2 + (sameLocation ? 3 : 0);
    const reasons = [
      ...(sharedSkills.length ? [`Shares ${sharedSkills.slice(0, 3).join(", ")}`] : []),
      ...(sharedTopics.length ? ["Similar interests"] : []),
      ...(mutualConnectionCount ? [`${mutualConnectionCount} mutual connection${mutualConnectionCount === 1 ? "" : "s"}`] : []),
      ...(sameLocation ? ["In your area"] : []),
    ];
    return {
      userId: profile.userId, displayName: profile.displayName, headline: profile.headline,
      location: profile.location, avatarUrl: profile.avatarUrl, accountTypes: profile.user.capabilities,
      skills: profile.user.skills.map(({ skill }) => skill), sharedSkills, mutualConnectionCount, reasons, score,
    };
  }).sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));

  return { recommendations: recommendations.slice(0, 12).map(({ score: _score, ...profile }) => profile) };
}
