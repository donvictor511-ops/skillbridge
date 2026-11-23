import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/appError";
import {
  commentParamsSchema,
  createCommentSchema,
  createPostSchema,
  postFeedQuerySchema,
  postParamsSchema,
  reactToPostSchema,
  sharePostSchema,
  updateCommentSchema,
  updatePostSchema,
} from "./posts.schema";
import {
  createComment as createCommentService,
  createPost as createPostService,
  createRepost as createRepostService,
  deleteComment as deleteCommentService,
  deletePost as deletePostService,
  likePost as likePostService,
  listComments as listCommentsService,
  listPosts as listPostsService,
  unlikePost as unlikePostService,
  sharePostWithConnection as sharePostWithConnectionService,
  removeRepost as removeRepostService,
  updateComment as updateCommentService,
  updatePost as updatePostService,
  reportPost as reportPostService,
  listProfilePosts as listProfilePostsService,
  reactToPost as reactToPostService,
} from "./posts.service";
import type { AuthUser } from "../auth/auth.types";

function getAuthenticatedUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Please log in to manage posts.",
    );
  }

  if (!req.user.onboardedAt) {
    throw new AppError(
      403,
      "ONBOARDING_REQUIRED",
      "Complete onboarding before managing posts.",
    );
  }

  return req.user;
}

export async function getPosts(req: Request, res: Response): Promise<void> {
  const query = postFeedQuerySchema.parse(req.query);
  const result = await listPostsService(req.user, query);

  res.status(200).json(result);
}

export async function getProfilePosts(req: Request, res: Response): Promise<void> {
  const authorId = z.uuid().parse(req.params.userId);
  const query = postFeedQuerySchema.parse(req.query);
  res.status(200).json(await listProfilePostsService(authorId, req.user, query));
}

export async function reactToPost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);
  const { reactionType } = reactToPostSchema.parse(req.body);
  await reactToPostService(user.id, postId, reactionType);
  res.status(204).send();
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const input = createPostSchema.parse(req.body);
  const result = await createPostService(user.id, input);

  res.status(201).json({ data: result });
}

export async function updatePost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);
  const input = updatePostSchema.parse(req.body);
  const result = await updatePostService(user.id, postId, input);

  res.status(200).json({ data: result });
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);

  await deletePostService(user.id, postId);

  res.status(204).send();
}

export async function likePost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);

  await likePostService(user.id, postId);

  res.status(204).send();
}

export async function unlikePost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);

  await unlikePostService(user.id, postId);

  res.status(204).send();
}

export async function sharePostWithConnection(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);
  const input = sharePostSchema.parse(req.body);
  const result = await sharePostWithConnectionService(user.id, postId, input);
  res.status(201).json({ data: result });
}

export async function createRepost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);
  const result = await createRepostService(user.id, postId);
  res.status(201).json({ data: result });
}

export async function removeRepost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);
  await removeRepostService(user.id, postId);
  res.status(204).send();
}

export async function getComments(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);
  const result = await listCommentsService(user, postId);

  res.status(200).json({ data: result });
}

export async function createComment(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse(req.params);
  const input = createCommentSchema.parse(req.body);
  const result = await createCommentService(user.id, postId, input);

  res.status(201).json({ data: result });
}

export async function updateComment(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId, commentId } = commentParamsSchema.parse(req.params);
  const input = updateCommentSchema.parse(req.body);
  const result = await updateCommentService(user.id, postId, commentId, input);

  res.status(200).json({ data: result });
}

export async function deleteComment(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId, commentId } = commentParamsSchema.parse(req.params);

  await deleteCommentService(user.id, postId, commentId);

  res.status(204).send();
}

export async function reportPost(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { postId } = postParamsSchema.parse({ postId: req.params.postId });
  const commentId = req.params.commentId ? commentParamsSchema.parse(req.params).commentId : undefined;
  const input = z.object({
    reason: z.enum(["spam", "harassment", "inappropriate_content", "misinformation", "other"]),
    details: z.string().trim().max(1000).optional(),
  }).parse(req.body);
  await reportPostService(user.id, postId, commentId, input);
  res.status(201).json({ data: { reported: true } });
}
