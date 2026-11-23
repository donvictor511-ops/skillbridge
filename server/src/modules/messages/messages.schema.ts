import { z } from "zod";

const uuidSchema = z.string().uuid();

export const createConversationSchema = z.object({
  userId: uuidSchema,
});

export const conversationParamsSchema = z.object({
  conversationId: uuidSchema,
});

export const messageParamsSchema = conversationParamsSchema.extend({
  messageId: uuidSchema,
});
export const messageReactionSchema = z.object({ emoji: z.enum(["👍", "❤️", "😂", "😮", "😢", "🙏"]) });

export const conversationListQuerySchema = z.object({
  archived: z.preprocess(
    (value) => value === "true" ? true : value === "false" ? false : value,
    z.boolean(),
  ).default(false),
  cursor: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const messageListQuerySchema = z.object({
  cursor: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export const createMessageSchema = z.object({
  content: z.string().trim().max(5000).default(""),
  mediaUrl: z.url().refine((value) => value.startsWith("https://"), "Media must use HTTPS.").optional(),
  mediaType: z.enum(["image", "video", "audio"]).optional(),
  replyToMessageId: uuidSchema.optional(),
}).refine((value) => Boolean(value.content || value.mediaUrl), "Write a message or attach a file.").refine((value) => Boolean(value.mediaUrl) === Boolean(value.mediaType), "Media type and file must be provided together.");
export const updateMessageSchema = z.object({ content: z.string().trim().min(1).max(5000) });

export const deleteMessageSchema = z.object({
  scope: z.enum(["me", "everyone"]).default("everyone"),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;
export type MessageListQuery = z.infer<typeof messageListQuerySchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
