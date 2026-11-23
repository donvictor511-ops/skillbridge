import { z } from "zod";

export const communityIdSchema = z.object({ communityId: z.uuid() });
export const createCommunitySchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(600),
  guidelines: z.string().trim().max(5000).default(""),
});
export const updateCommunitySchema = createCommunitySchema.partial().refine(
  (input) => Object.values(input).some((value) => value !== undefined),
  "Provide at least one field to update.",
);
export const communitySearchSchema = z.object({
  search: z.string().trim().max(100).optional(),
  mine: z.enum(["true", "false"]).optional(),
});
export const createCommunityPostSchema = z.object({
  content: z.string().trim().max(3000).default(""),
  mediaUrl: z.url().refine((value) => value.startsWith("https://"), "Media must use HTTPS.").optional(),
  mediaType: z.enum(["image", "video"]).optional(),
}).refine((input) => Boolean(input.content || input.mediaUrl), "Write a discussion or attach a file.").refine((input) => Boolean(input.mediaUrl) === Boolean(input.mediaType), "Media type and file must be provided together.");
export const communityInviteSchema = z.object({ userId: z.uuid() });
export const communityInviteResponseSchema = z.object({ status: z.enum(["accepted", "declined"]) });
export const createCommunityCommentSchema = z.object({ content: z.string().trim().min(1).max(2000) });
export const reportCommunitySchema = z.object({
  postId: z.uuid().optional(),
  commentId: z.uuid().optional(),
  reason: z.enum(["spam", "harassment", "inappropriate_content", "misinformation", "other"]),
  details: z.string().trim().max(1000).optional().transform((value) => value || null),
}).refine((input) => Number(Boolean(input.postId)) + Number(Boolean(input.commentId)) <= 1, "Report a post or comment, not both.");
export const resolveCommunityReportSchema = z.object({
  status: z.enum(["reviewed", "dismissed"]),
  removePost: z.boolean().default(false),
});
export const communityMemberRoleSchema = z.object({ role: z.enum(["moderator", "member"]) });
