import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import {
  archiveConversation, createOrGetConversation, deleteMessage,
  editMessage as editMessageService, getConversation, getMessageHistory, listConversationCalls, getUnreadMessageCount, listPresencePeerIds,
  listConversations, markConversationRead, restoreConversation, sendMessage, toggleMessageReaction,
} from "./messages.service";
import { addEventStream, isUserOnline, publishToUser, removeEventStream, sendEvent } from "./messages.realtime";
import {
  conversationListQuerySchema, conversationParamsSchema, createConversationSchema,
  createMessageSchema, messageListQuerySchema, messageParamsSchema,
  deleteMessageSchema, updateMessageSchema,
  messageReactionSchema,
  messageTypingSchema,
} from "./messages.schema";

function user(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before messaging.");
  return req.user;
}

export async function openEvents(req: Request, res: Response): Promise<void> {
  const current = user(req);
  res.status(200);
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "private, no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  const becameOnline = addEventStream(current.id, res);
  const peers = await listPresencePeerIds(current.id);
  for (const peerId of peers) sendEvent(res, "presence.changed", { userId: peerId, isOnline: isUserOnline(peerId) });
  if (becameOnline) for (const peerId of peers) publishToUser(peerId, "presence.changed", { userId: current.id, isOnline: true });
  const heartbeat = setInterval(() => { if (!res.writableEnded) res.write(": keep-alive\n\n"); }, 25000);
  res.on("close", () => {
    clearInterval(heartbeat);
    if (removeEventStream(current.id, res)) {
      void listPresencePeerIds(current.id).then((connectedPeers) => {
        for (const peerId of connectedPeers) publishToUser(peerId, "presence.changed", { userId: current.id, isOnline: false });
      });
    }
  });
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  res.json({ data: { count: await getUnreadMessageCount(user(req).id) } });
}
export async function conversations(req: Request, res: Response): Promise<void> {
  res.json(await listConversations(user(req).id, conversationListQuerySchema.parse(req.query)));
}
export async function createConversation(req: Request, res: Response): Promise<void> {
  res.status(201).json({ data: await createOrGetConversation(user(req).id, createConversationSchema.parse(req.body)) });
}
export async function typing(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  const current = user(req);
  const { isTyping } = messageTypingSchema.parse(req.body);
  const conversation = await getConversation(conversationId, current.id);
  publishToUser(conversation.otherUser.userId, "message.typing", { conversationId, userId: current.id, isTyping });
  res.status(204).send();
}
export async function conversation(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  res.json({ data: await getConversation(conversationId, user(req).id) });
}
export async function conversationCalls(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  res.json({ data: await listConversationCalls(conversationId, user(req).id) });
}
export async function messageHistory(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  res.json(await getMessageHistory(conversationId, user(req).id, messageListQuerySchema.parse(req.query)));
}
export async function createMessage(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  res.status(201).json({ data: await sendMessage(conversationId, user(req).id, createMessageSchema.parse(req.body)) });
}
export async function readConversation(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  res.json({ data: await markConversationRead(conversationId, user(req).id) });
}
export async function deleteConversation(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  res.json({ data: await archiveConversation(conversationId, user(req).id) });
}
export async function restore(req: Request, res: Response): Promise<void> {
  const { conversationId } = conversationParamsSchema.parse(req.params);
  res.json({ data: await restoreConversation(conversationId, user(req).id) });
}
export async function removeMessage(req: Request, res: Response): Promise<void> {
  const { conversationId, messageId } = messageParamsSchema.parse(req.params);
  const { scope } = deleteMessageSchema.parse(req.body ?? {});
  await deleteMessage(conversationId, messageId, user(req).id, scope);
  res.status(204).send();
}
export async function editMessage(req: Request, res: Response): Promise<void> {
  const { conversationId, messageId } = messageParamsSchema.parse(req.params);
  const input = updateMessageSchema.parse(req.body);
  res.status(200).json({ data: await editMessageService(conversationId, messageId, user(req).id, input.content) });
}
export async function reactToMessage(req: Request, res: Response): Promise<void> {
  const { conversationId, messageId } = messageParamsSchema.parse(req.params);
  const { emoji } = messageReactionSchema.parse(req.body);
  res.status(200).json({ data: await toggleMessageReaction(conversationId, messageId, user(req).id, emoji) });
}
