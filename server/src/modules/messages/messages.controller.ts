import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import {
  archiveConversation, createOrGetConversation, deleteMessage,
  editMessage as editMessageService, getConversation, getMessageHistory, listConversationCalls, getUnreadMessageCount,
  listConversations, markConversationRead, restoreConversation, sendMessage, toggleMessageReaction,
} from "./messages.service";
import { addEventStream, publishToUser, removeEventStream, sendEvent } from "./messages.realtime";
import { listPresencePeerIds } from "./presencePeers";
import {
  disconnectPresenceSession,
  endPresenceSession,
  newPresenceSessionId,
  onlineUserIds,
  refreshPresenceSession,
  registerPresenceSession,
} from "./presence.runtime";
import {
  conversationListQuerySchema, conversationParamsSchema, createConversationSchema,
  createMessageSchema, messageListQuerySchema, messageParamsSchema,
  deleteMessageSchema, updateMessageSchema,
  messageReactionSchema,
  messageTypingSchema, presenceHeartbeatSchema,
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
  const sessionId = newPresenceSessionId();
  addEventStream(current.id, res);
  let heartbeat: NodeJS.Timeout | null = null;
  let cleanedUp = false;
  let registered = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (heartbeat) clearInterval(heartbeat);
    removeEventStream(current.id, res);
    if (registered) void disconnectPresenceSession(sessionId).catch(() => {
      console.warn("Presence session cleanup failed; the stale-session timeout will expire it.");
    });
  };

  // Register cleanup before awaiting the peer lookup so a fast tab close cannot
  // leave this stream in the in-memory presence map indefinitely.
  res.once("close", cleanup);
  res.once("error", cleanup);
  heartbeat = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      cleanup();
      return;
    }
    try { res.write(": keep-alive\n\n"); }
    catch {
      cleanup();
    }
  }, 25000);

  try {
    await registerPresenceSession(sessionId, current.id);
    registered = true;
    if (cleanedUp || res.writableEnded || res.destroyed) {
      await disconnectPresenceSession(sessionId);
      return;
    }
    sendEvent(res, "presence.session", { sessionId });
    const peers = await listPresencePeerIds(current.id);
    if (cleanedUp || res.writableEnded || res.destroyed) return;
    const onlinePeers = await onlineUserIds(peers);
    if (cleanedUp || res.writableEnded || res.destroyed) return;
    for (const peerId of peers) sendEvent(res, "presence.changed", { userId: peerId, isOnline: onlinePeers.has(peerId) });
  } catch {
    // Let EventSource reconnect if the initial presence snapshot cannot be read.
    console.warn("Could not initialize a presence event stream; EventSource will reconnect.");
    res.end();
  }
}

export async function presenceHeartbeat(req: Request, res: Response): Promise<void> {
  const current = user(req);
  const { sessionId, ended } = presenceHeartbeatSchema.parse(req.body);
  if (ended) {
    await endPresenceSession(sessionId, current.id);
    res.status(204).end();
    return;
  }
  if (!(await refreshPresenceSession(sessionId, current.id))) {
    res.status(410).json({ error: { code: "PRESENCE_SESSION_EXPIRED", message: "Presence session expired. Reconnecting." } });
    return;
  }
  res.status(204).end();
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
