import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import type { DiscoverQuery } from "./discover.schema";

export async function discoverProfiles(viewerId: string, query: DiscoverQuery) {
  const { search, skill, location, accountType, page, limit } = query;

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

  const where: Prisma.ProfileWhereInput = {
    userId: { not: viewerId },
    visibility: { in: ["public", "members"] },

    user: {
      is: {
        onboardedAt: { not: null },
        ...(accountType ? { capabilities: { has: accountType } } : {}),
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
