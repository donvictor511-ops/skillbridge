import { prisma } from "../../db/prisma";

export interface GlobalSearchItem {
  id: string;
  type: "person" | "post" | "community" | "job" | "project";
  title: string;
  description: string;
  imageUrl: string | null;
  meta: string | null;
  href: string;
}

export async function globalSearch(viewerId: string, query: string) {
  const term = query.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const [profiles, posts, postComments, communities, jobs, projects, discussions, communityComments] = await Promise.all([
    prisma.profile.findMany({
      where: {
        visibility: { in: ["public", "members"] },
        userId: { not: viewerId },
        user: { is: { onboardedAt: { not: null }, blocksMade: { none: { blockedId: viewerId } }, blocksReceived: { none: { blockerId: viewerId } } } },
        OR: [{ displayName: contains(term) }, { headline: contains(term) }, { bio: contains(term) }, { location: contains(term) }, { user: { is: { skills: { some: { skill: { is: { name: contains(term) } } } } } } }],
      },
      orderBy: [{ updatedAt: "desc" }, { displayName: "asc" }], take: 5,
      select: { userId: true, displayName: true, headline: true, location: true, avatarUrl: true },
    }),
    prisma.post.findMany({
      where: {
        moderationStatus: "published", repostOfId: null,
        OR: [{ content: contains(term) }, { author: { is: { profile: { is: { displayName: contains(term) } } } } }],
        author: { is: { profile: { is: { visibility: { in: ["public", "members"] } } }, blocksMade: { none: { blockedId: viewerId } }, blocksReceived: { none: { blockerId: viewerId } } } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
      select: { id: true, content: true, createdAt: true, author: { select: { profile: { select: { displayName: true } } } } },
    }),
    prisma.postComment.findMany({
      where: {
        moderationStatus: "published", content: contains(term),
        post: {
          is: {
            moderationStatus: "published",
            author: {
              is: {
                profile: { is: { visibility: { in: ["public", "members"] } } },
                blocksMade: { none: { blockedId: viewerId } },
                blocksReceived: { none: { blockerId: viewerId } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
      select: { id: true, content: true, postId: true, createdAt: true, author: { select: { profile: { select: { displayName: true } } } } },
    }),
    prisma.community.findMany({
      where: { OR: [{ name: contains(term) }, { description: contains(term) }] },
      orderBy: [{ members: { _count: "desc" } }, { createdAt: "desc" }], take: 5,
      select: { id: true, name: true, description: true, _count: { select: { members: true } } },
    }),
    prisma.jobListing.findMany({
      where: { status: "open", OR: [{ title: contains(term) }, { description: contains(term) }, { category: contains(term) }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
      select: { id: true, title: true, description: true, category: true, location: true },
    }),
    prisma.projectListing.findMany({
      where: { status: { in: ["open", "in_progress"] }, OR: [{ title: contains(term) }, { description: contains(term) }, { category: contains(term) }, { skills: { hasSome: [term] } }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
      select: { id: true, title: true, description: true, category: true, skills: true },
    }),
    prisma.communityPost.findMany({
      where: { moderationStatus: "published", community: { is: { members: { some: { userId: viewerId } } } }, OR: [{ content: contains(term) }, { community: { is: { name: contains(term) } } }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
      select: { id: true, content: true, communityId: true, createdAt: true, community: { select: { name: true } } },
    }),
    prisma.communityComment.findMany({
      where: {
        moderationStatus: "published", content: contains(term),
        post: { is: { moderationStatus: "published", community: { is: { members: { some: { userId: viewerId } } } } } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
      select: { id: true, content: true, post: { select: { communityId: true, community: { select: { name: true } } } }, author: { select: { profile: { select: { displayName: true } } } } },
    }),
  ]);

  const items: GlobalSearchItem[] = [
    ...profiles.map((profile) => ({ id: profile.userId, type: "person" as const, title: profile.displayName, description: profile.headline ?? "SkillBridge member", imageUrl: profile.avatarUrl, meta: profile.location, href: `/profile/${encodeURIComponent(profile.userId)}` })),
    ...posts.map((post) => ({ id: post.id, type: "post" as const, title: post.author.profile?.displayName ?? "SkillBridge member", description: post.content, imageUrl: null, meta: "Post", href: `/posts#post-${encodeURIComponent(post.id)}` })),
    ...postComments.map((comment) => ({ id: comment.id, type: "post" as const, title: comment.author.profile?.displayName ?? "SkillBridge member", description: comment.content, imageUrl: null, meta: "Comment", href: `/posts#post-${encodeURIComponent(comment.postId)}` })),
    ...discussions.map((post) => ({ id: post.id, type: "post" as const, title: post.community.name, description: post.content, imageUrl: null, meta: "Community discussion", href: `/communities?communityId=${encodeURIComponent(post.communityId)}` })),
    ...communityComments.map((comment) => ({ id: comment.id, type: "post" as const, title: comment.author.profile?.displayName ?? comment.post.community.name, description: comment.content, imageUrl: null, meta: `Reply in ${comment.post.community.name}`, href: `/communities?communityId=${encodeURIComponent(comment.post.communityId)}` })),
    ...communities.map((community) => ({ id: community.id, type: "community" as const, title: community.name, description: community.description, imageUrl: null, meta: `${community._count.members} members`, href: `/communities?communityId=${encodeURIComponent(community.id)}` })),
    ...jobs.map((job) => ({ id: job.id, type: "job" as const, title: job.title, description: job.description, imageUrl: null, meta: [job.category, job.location].filter(Boolean).join(" · "), href: `/jobs/${encodeURIComponent(job.id)}` })),
    ...projects.map((project) => ({ id: project.id, type: "project" as const, title: project.title, description: project.description, imageUrl: null, meta: [project.category, project.skills.slice(0, 3).join(", ")].filter(Boolean).join(" · "), href: `/projects/${encodeURIComponent(project.id)}` })),
  ];

  return {
    query: term,
    groups: {
      people: items.filter((item) => item.type === "person"),
      posts: items.filter((item) => item.type === "post"),
      communities: items.filter((item) => item.type === "community"),
      jobs: items.filter((item) => item.type === "job"),
      projects: items.filter((item) => item.type === "project"),
    },
    total: items.length,
  };
}
