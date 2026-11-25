import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import type { AuthUser } from "../auth/auth.types";
import { notifyAdministrators } from "../notifications/notifications.service";
import { assessContent, saveModerationCase } from "../moderation/moderation.service";
import type {
  CreatePostInput,
  PostFeedQuery,
  UpdatePostInput,
  CreateCommentInput,
  UpdateCommentInput,
  SharePostInput,
} from "./posts.schema";

const postAuthorSelect = {
  id: true,
  profile: {
    select: {
      displayName: true,
      headline: true,
      avatarUrl: true,
      visibility: true,
    },
  },
} satisfies Prisma.UserSelect;

const postSelect = {
  id: true,
  content: true,
  moderationStatus: true,
  imageUrl: true,
  videoUrl: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  author: {
    select: postAuthorSelect,
  },
  repostOf: {
    select: {
      id: true,
      content: true,
      imageUrl: true,
      videoUrl: true,
      author: { select: postAuthorSelect },
    },
  },
  _count: {
    select: {
      likes: true,
      comments: { where: { moderationStatus: "published" } },
    },
  },
} satisfies Prisma.PostSelect;

function postNotFound(): AppError {
  return new AppError(404, "POST_NOT_FOUND", "Post not found.");
}

async function findAccessiblePost(
  postId: string,
  viewer: Pick<AuthUser, "id">,
) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      moderationStatus: "published",
      OR: [
        { authorId: viewer.id },
        {
          author: {
            is: {
              profile: {
                is: {
                  visibility: { in: ["public", "members"] },
                },
              },
            },
          },
        },
      ],
    },
    select: { id: true, authorId: true, repostOfId: true },
  });

  if (!post) {
    throw postNotFound();
  }

  return post;
}

function formatPost(
  post: Prisma.PostGetPayload<{ select: typeof postSelect }>,
  isLikedByViewer = false,
  isRepostedByViewer = false,
  reactionCounts: Record<ReactionType, number> = emptyReactionCounts(),
  viewerReaction: ReactionType | null = null,
  isFollowedByViewer = false,
) {
  const source = post.repostOf;
  const originalAuthor = source?.author;
  return {
    id: post.id,
    content: source?.content ?? post.content,
    moderationStatus: post.moderationStatus,
    imageUrl: source?.imageUrl ?? post.imageUrl,
    videoUrl: source?.videoUrl ?? post.videoUrl,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: {
      userId: post.author.id,
      displayName: post.author.profile?.displayName ?? "Unavailable profile",
      headline: post.author.profile?.headline ?? null,
      avatarUrl: post.author.profile?.avatarUrl ?? null,
      isFollowedByViewer,
    },
    repostOf: source && originalAuthor ? {
      id: source.id,
      author: {
        userId: originalAuthor.id,
        displayName: originalAuthor.profile?.displayName ?? "Unavailable profile",
        headline: originalAuthor.profile?.headline ?? null,
        avatarUrl: originalAuthor.profile?.avatarUrl ?? null,
      },
    } : null,
    likesCount: reactionCounts.like,
    reactionsCount: Object.values(reactionCounts).reduce((sum, count) => sum + count, 0),
    reactionCounts,
    viewerReaction,
    commentsCount: post._count.comments,
    isLikedByViewer,
    isRepostedByViewer,
  };
}

export async function listPosts(
  viewer: AuthUser | undefined,
  query: PostFeedQuery,
) {
  const visibilityWhere: Prisma.PostWhereInput = {
    AND: [
      { moderationStatus: "published" },
      { OR: viewer
      ? [
          { authorId: viewer.id },
          {
            author: {
              is: {
                profile: {
                  is: {
                    visibility: { in: ["public", "members"] },
                  },
                },
              },
            },
          },
        ]
      : [
          {
            author: {
              is: {
                profile: {
                  is: { visibility: "public" },
                },
              },
            },
          },
        ] },
    ],
  };
  const sourceVisibilityWhere: Prisma.PostWhereInput = {
    AND: [
      { moderationStatus: "published" },
      { OR: viewer
      ? [
          { authorId: viewer.id },
          { author: { is: { profile: { is: { visibility: { in: ["public", "members"] } } } } } },
        ]
      : [
          { author: { is: { profile: { is: { visibility: "public" } } } } },
        ] },
    ],
  };
  const feedVisibilityWhere: Prisma.PostWhereInput = {
    AND: [
      visibilityWhere,
      { OR: [{ repostOfId: null }, { repostOf: { is: sourceVisibilityWhere } }] },
    ],
  };

  let cursorDate: Date | undefined;

  if (query.cursor) {
    const cursorPost = await prisma.post.findFirst({
      where: {
        AND: [{ id: query.cursor }, feedVisibilityWhere],
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!cursorPost) {
      throw postNotFound();
    }

    cursorDate = cursorPost.createdAt;
  }

  const posts = await prisma.post.findMany({
    where: {
      AND: [
        feedVisibilityWhere,
        ...(cursorDate
          ? [
              {
                OR: [
                  { createdAt: { lt: cursorDate } },
                  {
                    createdAt: cursorDate,
                    id: { lt: query.cursor! },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    select: postSelect,
  });

  const hasMore = posts.length > query.limit;
  const page = posts.slice(0, query.limit);

  const postIds = page.map((post) => post.id);
  const [viewerReactions, groupedReactions, followedAuthors] = postIds.length ? await Promise.all([
    viewer ? prisma.postLike.findMany({
        where: {
          userId: viewer.id,
          postId: { in: postIds },
        },
        select: { postId: true, reactionType: true },
      }) : Promise.resolve([]),
    prisma.postLike.groupBy({ by: ["postId", "reactionType"], where: { postId: { in: postIds } }, _count: { _all: true } }),
    viewer ? prisma.follow.findMany({ where: { followerId: viewer.id, followedId: { in: page.map((post) => post.authorId) } }, select: { followedId: true } }) : Promise.resolve([]),
  ]) : [[], [], []];

  const sourceIds = page.map((post) => post.repostOf?.id ?? post.id);
  const repostedPostIds = viewer && sourceIds.length > 0
    ? await prisma.post.findMany({
        where: { authorId: viewer.id, repostOfId: { in: sourceIds } },
        select: { repostOfId: true },
      })
    : [];

  const viewerReactionByPost = new Map(viewerReactions.map((reaction) => [reaction.postId, reaction.reactionType]));
  const reactionsByPost = new Map<string, Record<ReactionType, number>>();
  for (const postId of postIds) reactionsByPost.set(postId, emptyReactionCounts());
  for (const reaction of groupedReactions) {
    const counts = reactionsByPost.get(reaction.postId);
    if (counts) counts[reaction.reactionType] = reaction._count._all;
  }
  const repostedPostIdSet = new Set(repostedPostIds.map((repost) => repost.repostOfId));
  const followedAuthorIds = new Set(followedAuthors.map((follow) => follow.followedId));

  return {
    data: page.map((post) => formatPost(
      post,
      viewerReactionByPost.get(post.id) === "like",
      repostedPostIdSet.has(post.repostOf?.id ?? post.id),
      reactionsByPost.get(post.id),
      viewerReactionByPost.get(post.id) ?? null,
      followedAuthorIds.has(post.author.id),
    )),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

type ReactionType = "like" | "love" | "celebrate" | "support" | "insightful";
function emptyReactionCounts(): Record<ReactionType, number> { return { like: 0, love: 0, celebrate: 0, support: 0, insightful: 0 }; }

export async function listProfilePosts(authorId: string, viewer: AuthUser | undefined, query: PostFeedQuery) {
  const profile = await prisma.profile.findUnique({ where: { userId: authorId }, select: { visibility: true } });
  if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
  const isOwner = viewer?.id === authorId;
  if (profile.visibility === "private" && !isOwner) throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
  if (profile.visibility === "members" && !viewer) throw new AppError(401, "LOGIN_REQUIRED", "Log in to view this profile.");
  if (viewer && !isOwner) {
    const blocked = await prisma.userBlock.findFirst({ where: { OR: [{ blockerId: viewer.id, blockedId: authorId }, { blockerId: authorId, blockedId: viewer.id }] }, select: { blockerId: true } });
    if (blocked) throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
  }
  let cursorDate: Date | undefined;
  if (query.cursor) {
    const cursorPost = await prisma.post.findFirst({ where: { id: query.cursor, authorId, moderationStatus: "published", repostOfId: null }, select: { id: true, createdAt: true } });
    if (!cursorPost) throw postNotFound();
    cursorDate = cursorPost.createdAt;
  }
  const posts = await prisma.post.findMany({
    where: { authorId, moderationStatus: "published", repostOfId: null, ...(cursorDate ? { OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: query.cursor! } }] } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: query.limit + 1, select: postSelect,
  });
  const hasMore = posts.length > query.limit;
  const page = posts.slice(0, query.limit);
  const ids = page.map((post) => post.id);
  const [reactions, grouped, reposted, authorFollow] = ids.length ? await Promise.all([
    viewer ? prisma.postLike.findMany({ where: { userId: viewer.id, postId: { in: ids } }, select: { postId: true, reactionType: true } }) : Promise.resolve([]),
    prisma.postLike.groupBy({ by: ["postId", "reactionType"], where: { postId: { in: ids } }, _count: { _all: true } }),
    viewer ? prisma.post.findMany({ where: { authorId: viewer.id, repostOfId: { in: ids } }, select: { repostOfId: true } }) : Promise.resolve([]),
    viewer && viewer.id !== authorId ? prisma.follow.findUnique({ where: { followerId_followedId: { followerId: viewer.id, followedId: authorId } }, select: { followerId: true } }) : Promise.resolve(null),
  ]) : [[], [], [], null];
  const byPost = new Map<string, Record<ReactionType, number>>();
  for (const id of ids) byPost.set(id, emptyReactionCounts());
  for (const row of grouped) { const count = byPost.get(row.postId); if (count) count[row.reactionType] = row._count._all; }
  const viewerReaction = new Map(reactions.map((row) => [row.postId, row.reactionType]));
  const repostedIds = new Set(reposted.map((row) => row.repostOfId).filter((id): id is string => Boolean(id)));
  return { data: page.map((post) => formatPost(post, viewerReaction.get(post.id) === "like", repostedIds.has(post.id), byPost.get(post.id), viewerReaction.get(post.id) ?? null, Boolean(authorFollow))), nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null };
}

export async function createPost(authorId: string, input: CreatePostInput) {
  const assessment = await assessContent(authorId, input.content, "post");
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId,
        content: input.content,
        imageUrl: input.imageUrl ?? null,
        videoUrl: input.videoUrl ?? null,
        moderationStatus: assessment.status,
      },
      select: postSelect,
    });
    await saveModerationCase(tx, { contentType: "post", contentId: created.id, authorId, content: input.content }, assessment);
    return created;
  });

  return formatPost(post);
}

export async function createRepost(authorId: string, postId: string) {
  const selectedPost = await findAccessiblePost(postId, { id: authorId });
  const originalPostId = selectedPost.repostOfId ?? selectedPost.id;
  const originalPost = await findAccessiblePost(originalPostId, { id: authorId });

  if (originalPost.authorId === authorId) {
    throw new AppError(400, "CANNOT_REPOST_OWN_POST", "You cannot repost your own post.");
  }

  const existing = await prisma.post.findFirst({
    where: { authorId, repostOfId: originalPostId },
    select: postSelect,
  });
  if (existing) return formatPost(existing, false, true);

  try {
    const repost = await prisma.post.create({
      data: { authorId, repostOfId: originalPostId, content: "" },
      select: postSelect,
    });
    return formatPost(repost, false, true);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.post.findFirst({
        where: { authorId, repostOfId: originalPostId },
        select: postSelect,
      });
      if (raced) return formatPost(raced, false, true);
    }
    throw error;
  }
}

export async function removeRepost(authorId: string, postId: string): Promise<void> {
  const selectedPost = await findAccessiblePost(postId, { id: authorId });
  const originalPostId = selectedPost.repostOfId ?? selectedPost.id;
  const removed = await prisma.post.deleteMany({
    where: { authorId, repostOfId: originalPostId },
  });
  if (removed.count !== 1) throw postNotFound();
}

export async function updatePost(
  authorId: string,
  postId: string,
  input: UpdatePostInput,
) {
  const result = await prisma.post.updateMany({
    where: {
      id: postId,
      authorId,
    },
    data: {
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
    },
  });

  if (result.count !== 1) {
    throw postNotFound();
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: postSelect,
  });

  if (!post) {
    throw postNotFound();
  }

  return formatPost(post);
}

export async function deletePost(
  authorId: string,
  postId: string,
): Promise<void> {
  const result = await prisma.post.deleteMany({
    where: {
      id: postId,
      authorId,
    },
  });

  if (result.count !== 1) {
    throw postNotFound();
  }
}

export async function likePost(userId: string, postId: string): Promise<void> {
  const post = await findAccessiblePost(postId, { id: userId });

  await prisma.$transaction(async (tx) => {
    const previous = await tx.postLike.findUnique({ where: { postId_userId: { postId, userId } }, select: { reactionType: true } });
    await tx.postLike.upsert({ where: { postId_userId: { postId, userId } }, create: { postId, userId, reactionType: "like" }, update: { reactionType: "like" } });

    if (previous?.reactionType !== "like" && post.authorId !== userId) {
      await tx.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: "post_like",
          message: "liked your post.",
          resourceId: postId,
        },
      });
    }
  });
}

export async function reactToPost(userId: string, postId: string, reactionType: ReactionType): Promise<void> {
  const post = await findAccessiblePost(postId, { id: userId });
  await prisma.$transaction(async (tx) => {
    const previous = await tx.postLike.findUnique({ where: { postId_userId: { postId, userId } }, select: { reactionType: true } });
    await tx.postLike.upsert({ where: { postId_userId: { postId, userId } }, create: { postId, userId, reactionType }, update: { reactionType } });
    if (previous?.reactionType !== reactionType && post.authorId !== userId) {
      const message = reactionType === "insightful" ? "found your post insightful." : `${reactionType === "like" ? "liked" : reactionType === "love" ? "loved" : reactionType === "celebrate" ? "celebrated" : "supported"} your post.`;
      await tx.notification.create({ data: { recipientId: post.authorId, actorId: userId, type: "post_like", message, resourceId: postId } });
    }
  });
}

export async function unlikePost(
  userId: string,
  postId: string,
): Promise<void> {
  await findAccessiblePost(postId, { id: userId });

  await prisma.postLike.deleteMany({
    where: {
      postId,
      userId,
    },
  });
}

export async function sharePostWithConnection(
  actorId: string,
  postId: string,
  input: SharePostInput,
) {
  await findAccessiblePost(postId, { id: actorId });

  const connection = await prisma.connection.findFirst({
    where: {
      status: "accepted",
      OR: [
        { userLowId: actorId, userHighId: input.recipientId },
        { userLowId: input.recipientId, userHighId: actorId },
      ],
    },
    select: { id: true },
  });

  if (!connection) {
    throw new AppError(
      404,
      "SHARE_RECIPIENT_NOT_AVAILABLE",
      "Choose one of your accepted connections.",
    );
  }

  const recipientCanView = await prisma.post.findFirst({
    where: {
      id: postId,
      OR: [
        { authorId: input.recipientId },
        {
          author: {
            is: {
              profile: {
                is: { visibility: { in: ["public", "members"] } },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!recipientCanView) {
    throw new AppError(
      404,
      "POST_NOT_AVAILABLE",
      "This post is not available to that connection.",
    );
  }

  return prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId,
      type: "post_shared",
      message: "shared a post with you.",
      resourceId: postId,
    },
    select: { id: true, recipientId: true, resourceId: true, createdAt: true },
  });
}

const commentSelect = {
  id: true,
  parentCommentId: true,
  content: true,
  moderationStatus: true,
  imageUrl: true,
  videoUrl: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  author: {
    select: postAuthorSelect,
  },
} satisfies Prisma.PostCommentSelect;

function formatComment(
  comment: Prisma.PostCommentGetPayload<{
    select: typeof commentSelect;
  }>,
) {
  return {
    id: comment.id,
    parentCommentId: comment.parentCommentId,
    content: comment.content,
    moderationStatus: comment.moderationStatus,
    imageUrl: comment.imageUrl,
    videoUrl: comment.videoUrl,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: {
      userId: comment.author.id,
      displayName: comment.author.profile?.displayName ?? "Unavailable profile",
      headline: comment.author.profile?.headline ?? null,
      avatarUrl: comment.author.profile?.avatarUrl ?? null,
    },
  };
}

export async function listComments(viewer: AuthUser, postId: string) {
  await findAccessiblePost(postId, viewer);

  const comments = await prisma.postComment.findMany({
    where: { postId, moderationStatus: "published" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: commentSelect,
  });

  const commentIds = comments.map((comment) => comment.id);
  const [likes, viewerLikes] = commentIds.length ? await Promise.all([
    prisma.postCommentLike.groupBy({ by: ["commentId"], where: { commentId: { in: commentIds } }, _count: { _all: true } }),
    prisma.postCommentLike.findMany({ where: { commentId: { in: commentIds }, userId: viewer.id }, select: { commentId: true } }),
  ]) : [[], []];
  const counts = new Map(likes.map((row) => [row.commentId, row._count._all]));
  const likedIds = new Set(viewerLikes.map((row) => row.commentId));
  return comments.map((comment) => ({ ...formatComment(comment), likesCount: counts.get(comment.id) ?? 0, isLikedByViewer: likedIds.has(comment.id) }));
}

export async function toggleCommentLike(userId: string, postId: string, commentId: string, liked: boolean): Promise<void> {
  await findAccessiblePost(postId, { id: userId });
  const comment = await prisma.postComment.findFirst({ where: { id: commentId, postId, moderationStatus: "published" }, select: { id: true } });
  if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found.");
  if (liked) {
    await prisma.postCommentLike.upsert({ where: { commentId_userId: { commentId, userId } }, create: { commentId, userId }, update: {} });
  } else {
    await prisma.postCommentLike.deleteMany({ where: { commentId, userId } });
  }
}

export async function createComment(
  authorId: string,
  postId: string,
  input: CreateCommentInput,
) {
  const post = await findAccessiblePost(postId, { id: authorId });
  let parentComment: { id: string; authorId: string; parentCommentId: string | null } | null = null;
  if (input.parentCommentId) {
    parentComment = await prisma.postComment.findFirst({ where: { id: input.parentCommentId, postId, moderationStatus: "published" }, select: { id: true, authorId: true, parentCommentId: true } });
    if (!parentComment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found.");
    if (parentComment.parentCommentId) throw new AppError(400, "REPLY_DEPTH_LIMIT", "Replies can be made to top-level comments only.");
  }
  const assessment = await assessContent(authorId, input.content, "comment");

  const comment = await prisma.$transaction(async (tx) => {
    const createdComment = await tx.postComment.create({
      data: {
        postId,
        parentCommentId: parentComment?.id ?? null,
        authorId,
        content: input.content,
        moderationStatus: assessment.status,
        imageUrl: input.imageUrl ?? null,
        videoUrl: input.videoUrl ?? null,
      },
      select: commentSelect,
    });

    await saveModerationCase(tx, { contentType: "comment", contentId: createdComment.id, authorId, content: input.content }, assessment);

    if (assessment.status === "published") {
      const notificationTargets = new Map<string, string>();
      if (parentComment && parentComment.authorId !== authorId) notificationTargets.set(parentComment.authorId, "replied to your comment.");
      if (!parentComment && post.authorId !== authorId) notificationTargets.set(post.authorId, "commented on your post.");
      if (parentComment && post.authorId !== authorId && post.authorId !== parentComment.authorId) notificationTargets.set(post.authorId, "replied to a comment on your post.");
      for (const [recipientId, message] of notificationTargets) await tx.notification.create({
        data: {
          recipientId,
          actorId: authorId,
          type: "post_comment",
          message,
          resourceId: postId,
        },
      });
    }

    return createdComment;
  });

  return formatComment(comment);
}

export async function updateComment(
  authorId: string,
  postId: string,
  commentId: string,
  input: UpdateCommentInput,
) {
  const result = await prisma.postComment.updateMany({
    where: {
      id: commentId,
      postId,
      authorId,
    },
    data: {
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
    },
  });

  if (result.count !== 1) {
    throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found.");
  }

  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: commentSelect,
  });

  if (!comment) {
    throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found.");
  }

  return formatComment(comment);
}

export async function deleteComment(
  authorId: string,
  postId: string,
  commentId: string,
): Promise<void> {
  const result = await prisma.postComment.deleteMany({
    where: {
      id: commentId,
      postId,
      authorId,
    },
  });

  if (result.count !== 1) {
    throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found.");
  }
}

export async function reportPost(reporterId: string, postId: string, commentId: string | undefined, input: { reason: string; details?: string }) {
  const target = commentId
    ? await prisma.postComment.findFirst({ where: { id: commentId, postId }, select: { authorId: true, content: true } })
    : await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, content: true } });
  if (!target) throw new AppError(404, "CONTENT_NOT_FOUND", "Post or comment not found.");
  if (target.authorId === reporterId) throw new AppError(400, "CANNOT_REPORT_OWN_CONTENT", "You cannot report your own content.");
  const duplicate = await prisma.postReport.findFirst({ where: { reporterId, status: "pending", ...(commentId ? { commentId } : { postId }) }, select: { id: true } });
  if (duplicate) throw new AppError(409, "DUPLICATE_REPORT", "You have already reported this content.");
  await prisma.$transaction(async (tx) => {
    const report = await tx.postReport.create({ data: { reporterId, reportedUserId: target.authorId, postId: commentId ? null : postId, commentId: commentId ?? null, reason: input.reason, details: input.details || null, contentSnapshot: target.content.slice(0, 3000) }, select: { id: true } });
    await notifyAdministrators(tx, { actorId: reporterId, type: "moderation_report", message: commentId ? "A comment on a post was reported and needs review." : "A post was reported and needs review.", resourceId: report.id });
  });
}
