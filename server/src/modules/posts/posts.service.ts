import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreatePostInput,
  PostFeedQuery,
  UpdatePostInput,
  CreateCommentInput,
  UpdateCommentInput,
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
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  author: {
    select: postAuthorSelect,
  },
  _count: {
    select: {
      likes: true,
      comments: true,
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
    select: { id: true },
  });

  if (!post) {
    throw postNotFound();
  }

  return post;
}

function formatPost(
  post: Prisma.PostGetPayload<{ select: typeof postSelect }>,
  isLikedByViewer = false,
) {
  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: {
      userId: post.author.id,
      displayName: post.author.profile?.displayName ?? "Unavailable profile",
      headline: post.author.profile?.headline ?? null,
      avatarUrl: post.author.profile?.avatarUrl ?? null,
    },
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    isLikedByViewer,
  };
}

export async function listPosts(
  viewer: AuthUser | undefined,
  query: PostFeedQuery,
) {
  // Apply the same profile visibility rules to the cursor and feed.
  const visibilityWhere: Prisma.PostWhereInput = {
    OR: viewer
      ? [
          // Users can always see their own posts.
          { authorId: viewer.id },

          // Logged-in users can see public and members profiles.
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
          // Anonymous visitors can only see public profiles.
          {
            author: {
              is: {
                profile: {
                  is: { visibility: "public" },
                },
              },
            },
          },
        ],
  };

  let cursorDate: Date | undefined;

  if (query.cursor) {
    // A cursor must belong to a post this viewer can access.
    const cursorPost = await prisma.post.findFirst({
      where: {
        AND: [{ id: query.cursor }, visibilityWhere],
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
        visibilityWhere,
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

  const likedPostIds = viewer
    ? await prisma.postLike.findMany({
        where: {
          userId: viewer.id,
          postId: { in: page.map((post) => post.id) },
        },
        select: {
          postId: true,
        },
      })
    : [];

  const likedPostIdSet = new Set(likedPostIds.map((like) => like.postId));

  return {
    data: page.map((post) => formatPost(post, likedPostIdSet.has(post.id))),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function createPost(authorId: string, input: CreatePostInput) {
  const post = await prisma.post.create({
    data: {
      authorId,
      content: input.content,
      imageUrl: input.imageUrl ?? null,
    },
    select: postSelect,
  });

  return formatPost(post);
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
  await findAccessiblePost(postId, { id: userId });

  await prisma.postLike.upsert({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
    create: {
      postId,
      userId,
    },
    update: {},
  });
}

export async function unlikePost(
  userId: string,
  postId: string,
): Promise<void> {
  await findAccessiblePost(postId, { id: userId } as AuthUser);

  await prisma.postLike.deleteMany({
    where: {
      postId,
      userId,
    },
  });
}

const commentSelect = {
  id: true,
  content: true,
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
    content: comment.content,
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
    where: { postId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: commentSelect,
  });

  return comments.map(formatComment);
}

export async function createComment(
  authorId: string,
  postId: string,
  input: CreateCommentInput,
) {
  await findAccessiblePost(postId, { id: authorId });

  const comment = await prisma.postComment.create({
    data: {
      postId,
      authorId,
      content: input.content,
    },
    select: commentSelect,
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
      content: input.content,
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
