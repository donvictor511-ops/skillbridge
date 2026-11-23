import { z } from "zod";

const id = z.uuid();
export const createCallSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("direct"), mode: z.enum(["audio", "video"]), conversationId: id }),
  z.object({ kind: z.literal("community"), mode: z.enum(["audio", "video"]), communityId: id }),
  z.object({ kind: z.literal("interview"), mode: z.enum(["audio", "video"]), interviewId: id }),
]);
export const callIdSchema = z.object({ callId: id });
export const communityIdSchema = z.object({ communityId: id });
export const callMessageSchema = z.object({
  content: z.string().trim().max(5000).default(""),
  mediaUrl: z.url().refine((value) => value.startsWith("https://")).optional(),
  mediaType: z.enum(["image", "video", "audio"]).optional(),
}).refine((value) => value.content.length > 0 || Boolean(value.mediaUrl), "Write a message or attach media.").refine((value) => Boolean(value.mediaUrl) === Boolean(value.mediaType), "Media URL and type must be provided together.");
export const callSignalSchema = z.object({
  toUserId: id,
  signal: z.record(z.string(), z.unknown()).refine((value) => JSON.stringify(value).length <= 80_000, "Signal is too large."),
});
