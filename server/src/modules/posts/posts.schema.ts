import { z } from "zod";

const uuidSchema = z.string().uuid();

export const postParamsSchema = z.object({
  postId: uuidSchema,
});

export const commentParamsSchema = z.object({
  postId: uuidSchema,
  commentId: uuidSchema,
});

export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(3000),
  imageUrl: z.string().url().max(2048).optional().nullable(),
});

export const updatePostSchema = z
  .object({
    content: z.string().trim().min(1).max(3000).optional(),
    imageUrl: z.string().url().max(2048).optional().nullable(),
  })
  .refine((data) => data.content !== undefined || data.imageUrl !== undefined, {
    message: "Provide content or imageUrl to update.",
  });

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const postFeedQuerySchema = z.object({
  cursor: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type PostFeedQuery = z.infer<typeof postFeedQuerySchema>;
