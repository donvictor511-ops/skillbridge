import { z } from "zod";

const uuidSchema = z.string().uuid();

const mediaUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((url) => url.startsWith("https://"), "Media URLs must use HTTPS.")
  .nullable()
  .optional();

export const postParamsSchema = z.object({
  postId: uuidSchema,
});

export const sharePostSchema = z.object({ recipientId: uuidSchema });

export const commentParamsSchema = z.object({
  postId: uuidSchema,
  commentId: uuidSchema,
});

export const createPostSchema = z.object({
  content: z.string().trim().max(3000).default(""),
  imageUrl: mediaUrlSchema,
  videoUrl: mediaUrlSchema,
}).refine((data) => !(data.imageUrl && data.videoUrl), {
  message: "Attach either an image or a video, not both.",
}).refine((data) => Boolean(data.content || data.imageUrl || data.videoUrl), {
  message: "Add some text or attach an image or video.",
});

export const updatePostSchema = z
  .object({
    content: z.string().trim().min(1).max(3000).optional(),
    imageUrl: mediaUrlSchema,
    videoUrl: mediaUrlSchema,
  })
  .refine((data) => !(data.imageUrl && data.videoUrl), {
    message: "Attach either an image or a video, not both.",
  })
  .refine(
    (data) =>
      data.content !== undefined ||
      data.imageUrl !== undefined ||
      data.videoUrl !== undefined,
    {
      message: "Provide content, imageUrl, or videoUrl to update.",
    },
  );

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentCommentId: uuidSchema.optional(),
  imageUrl: mediaUrlSchema,
  videoUrl: mediaUrlSchema,
}).refine((data) => !(data.imageUrl && data.videoUrl), {
  message: "Attach either an image or a video, not both.",
});

export const reactToPostSchema = z.object({ reactionType: z.enum(["like", "love", "celebrate", "support", "insightful"]) });

export const updateCommentSchema = z
  .object({
    content: z.string().trim().min(1).max(2000).optional(),
    imageUrl: mediaUrlSchema,
    videoUrl: mediaUrlSchema,
  })
  .refine((data) => !(data.imageUrl && data.videoUrl), {
    message: "Attach either an image or a video, not both.",
  })
  .refine(
    (data) =>
      data.content !== undefined ||
      data.imageUrl !== undefined ||
      data.videoUrl !== undefined,
    {
      message: "Provide content, imageUrl, or videoUrl to update.",
    },
  );

export const postFeedQuerySchema = z.object({
  cursor: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type PostFeedQuery = z.infer<typeof postFeedQuerySchema>;
export type SharePostInput = z.infer<typeof sharePostSchema>;
