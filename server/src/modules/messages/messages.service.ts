import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { isUserOnline, publishToUser } from "./messages.realtime";
import type {
  ConversationListQuery,
  CreateConversationInput,
  CreateMessageInput,
  MessageListQuery,
} from "./messages.schema";
import { usersHaveBlockedEachOther } from "../profiles/profile.blocking";

const profileSelect = {
  id: true,
  profile: {
    select: {
      displayName: true,
      headline: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.UserSelect;

const latestMessageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  createdAt: true,
  deletedAt: true,
  deletedForLowAt: true,
  deletedForHighAt: true,
  mediaUrl: true,
  mediaType: true,
  editedAt: true,
} satisfies Prisma.MessageSelect;

const conversationInclude = {
  userLow: { select: profileSelect },
  userHigh: { select: profileSelect },
  participants: {
    select: {
      userId: true,
      lastReadAt: true,
      archivedAt: true,
    },
  },
  messages: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: latestMessageSelect,
  },
} satisfies Prisma.ConversationInclude;

type ConversationRow = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  createdAt: true,
  deletedAt: true,
  deletedForLowAt: true,
  deletedForHighAt: true,
  mediaUrl: true,
  mediaType: true,
  editedAt: true,
  replyTo: { select: { id: true, content: true, mediaType: true, deletedAt: true, sender: { select: profileSelect } } },
  reactions: { select: { userId: true, emoji: true } },
  sender: { select: profileSelect },
} satisfies Prisma.MessageSelect;

type MessageRow = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

function pairForUsers(firstId: string, secondId: string) {
  return firstId.toLowerCase() < secondId.toLowerCase()
    ? { userLowId: firstId, userHighId: secondId }
    : { userLowId: secondId, userHighId: firstId };
}

function notFound(): AppError {
  return new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
}

function otherUser(row: ConversationRow, viewerId: string) {
  const user = row.userLowId === viewerId ? row.userHigh : row.userLow;
  return {
    userId: user.id,
    displayName: user.profile?.displayName ?? "Unavailable profile",
    headline: user.profile?.headline ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    isOnline: isUserOnline(user.id),
  };
}

function messagePreview(content: string, deletedAt: Date | null, mediaType: string | null = null): string {
  if (deletedAt) return "This message was deleted.";
  if (content) return content;
  return mediaType === "audio" ? "Voice message" : mediaType === "video" ? "Video" : mediaType === "image" ? "Photo" : "";
}

function conversationMessagePreview(content: string, deletedAt: Date | null, mediaType: string | null): string {
  if (deletedAt) return "This message was deleted.";
  if (mediaType === "audio") return "Voice message";
  if (mediaType === "image") return content ? `${content} · Sent a photo` : "Sent a photo";
  if (mediaType === "video") return content ? `${content} · Sent a video` : "Sent a video";
  return content;
}

function formatMessage(row: MessageRow, otherLastReadAt: Date | null, viewerId: string) {
  const reactionCounts = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
  for (const reaction of row.reactions) {
    const current = reactionCounts.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, reactedByMe: false };
    current.count += 1;
    current.reactedByMe ||= reaction.userId === viewerId;
    reactionCounts.set(reaction.emoji, current);
  }
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    content: messagePreview(row.content, row.deletedAt, row.mediaType),
    isDeleted: row.deletedAt !== null,
    mediaUrl: row.mediaUrl,
    mediaType: row.mediaType,
    editedAt: row.editedAt?.toISOString() ?? null,
    replyTo: row.replyTo ? {
      id: row.replyTo.id,
      content: row.replyTo.deletedAt ? "Message deleted" : messagePreview(row.replyTo.content, null, row.replyTo.mediaType),
      senderName: row.replyTo.sender.profile?.displayName ?? "SkillBridge member",
      mediaType: row.replyTo.mediaType,
    } : null,
    reactions: [...reactionCounts.values()],
    createdAt: row.createdAt.toISOString(),
    readByRecipient:
      row.senderId === viewerId &&
      otherLastReadAt !== null &&
      otherLastReadAt >= row.createdAt,
    sender: {
      userId: row.sender.id,
      displayName: row.sender.profile?.displayName ?? "Unavailable profile",
      avatarUrl: row.sender.profile?.avatarUrl ?? null,
    },
  };
}

async function unreadCountForConversation(
  conversationId: string,
  userId: string,
  lastReadAt: Date | null,
  isLowUser: boolean,
): Promise<number> {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      deletedAt: null,
      ...(isLowUser ? { deletedForLowAt: null } : { deletedForHighAt: null }),
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}

async function formatConversation(row: ConversationRow, viewerId: string) {
  const participant = row.participants.find((item) => item.userId === viewerId);
  if (!participant) throw notFound();

  const lastMessage = row.messages[0];
  const hiddenForViewer = lastMessage && (row.userLowId === viewerId
    ? lastMessage.deletedForLowAt !== null
    : lastMessage.deletedForHighAt !== null);
  const [messageUnreadCount, callHistory] = await Promise.all([unreadCountForConversation(
    row.id,
    viewerId,
    participant.lastReadAt,
    row.userLowId === viewerId,
  ), prisma.callSession.findMany({
    where: { conversationId: row.id }, orderBy: { createdAt: "desc" }, take: 20,
    select: { id: true, mode: true, status: true, createdAt: true, endedAt: true, createdById: true, participants: { select: { userId: true, status: true, joinedAt: true } } },
  })]);
  const latestCall = callHistory[0] ?? null;
  const unreadMissedCalls = callHistory.filter((call) => call.status === "ended" && call.createdById !== viewerId && (!participant.lastReadAt || call.createdAt > participant.lastReadAt) && call.participants.some((item) => item.userId === viewerId && item.status === "invited" && item.joinedAt === null)).length;
  const unreadCount = messageUnreadCount + unreadMissedCalls;
  const latestViewerCallStatus = latestCall?.participants.find((item) => item.userId === viewerId)?.status;
  const latestCallMissed = latestCall && latestCall.status === "ended" && latestViewerCallStatus !== "declined" && latestCall.participants.every((item) => item.userId === latestCall.createdById || item.joinedAt === null);
  const callPreview = latestCall ? latestCall.status === "active" ? `${latestCall.createdById === viewerId ? "Calling" : "Incoming"} ${latestCall.mode === "audio" ? "voice" : "video"} call` : latestCall.createdById === viewerId ? (latestCall.participants.some((item) => item.status === "declined") ? `Declined ${latestCall.mode === "audio" ? "voice" : "video"} call` : latestCall.participants.some((item) => item.userId !== viewerId && item.joinedAt) ? `${latestCall.mode === "audio" ? "Voice" : "Video"} call` : `No answer · ${latestCall.mode === "audio" ? "voice" : "video"} call`) : latestViewerCallStatus === "declined" ? `Declined ${latestCall.mode === "audio" ? "voice" : "video"} call` : latestCallMissed ? `Missed ${latestCall.mode === "audio" ? "voice" : "video"} call` : `${latestCall.mode === "audio" ? "Voice" : "Video"} call` : null;
  const callIsLatest = Boolean(latestCall && (!lastMessage || latestCall.createdAt > lastMessage.createdAt));

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: participant.archivedAt?.toISOString() ?? null,
    otherUser: otherUser(row, viewerId),
    unreadCount,
    lastMessage: callIsLatest && latestCall && callPreview ? {
      id: latestCall.id,
      senderId: latestCall.createdById,
      content: callPreview,
      isDeleted: false,
      createdAt: latestCall.createdAt.toISOString(),
      isCall: true,
    } : lastMessage
      ? {
          id: lastMessage.id,
          senderId: lastMessage.senderId,
          content: hiddenForViewer ? "Message deleted for you." : conversationMessagePreview(lastMessage.content, lastMessage.deletedAt, lastMessage.mediaType),
          isDeleted: lastMessage.deletedAt !== null,
          createdAt: lastMessage.createdAt.toISOString(),
          isCall: false,
        }
      : null,
  };
}

async function findConversationRow(
  conversationId: string,
  viewerId: string,
): Promise<ConversationRow> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId: viewerId } },
    },
    include: conversationInclude,
  });

  if (!conversation) throw notFound();
  const otherUserId = conversation.userLowId === viewerId ? conversation.userHighId : conversation.userLowId;
  if (await usersHaveBlockedEachOther(viewerId, otherUserId)) throw notFound();
  return conversation;
}

export async function listPresencePeerIds(userId: string): Promise<string[]> {
  const connections = await prisma.connection.findMany({
    where: {
      status: "accepted",
      OR: [{ userLowId: userId }, { userHighId: userId }],
    },
    select: { userLowId: true, userHighId: true },
  });

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    select: { userLowId: true, userHighId: true },
  });

  return [...new Set([
    ...connections.map((connection) => connection.userLowId === userId ? connection.userHighId : connection.userLowId),
    ...conversations.map((conversation) => conversation.userLowId === userId ? conversation.userHighId : conversation.userLowId),
  ])];
}

export async function createOrGetConversation(
  userId: string,
  input: CreateConversationInput,
) {
  if (userId === input.userId) {
    throw new AppError(
      400,
      "SELF_CONVERSATION",
      "You cannot start a conversation with yourself.",
    );
  }

  if (await usersHaveBlockedEachOther(userId, input.userId)) throw notFound();

  const pair = pairForUsers(userId, input.userId);
  const existing = await prisma.conversation.findUnique({
    where: { userLowId_userHighId: pair },
    select: { id: true },
  });

  if (existing) {
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: existing.id, userId },
      data: { archivedAt: null },
    });
    return getConversation(existing.id, userId);
  }

  const connection = await prisma.connection.findUnique({
    where: { userLowId_userHighId: pair },
    select: { status: true },
  });

  const acceptedCollaboration = await prisma.jobApplication.findFirst({
    where: {
      status: "accepted",
      OR: [
        { applicantId: userId, job: { ownerId: input.userId } },
        { applicantId: input.userId, job: { ownerId: userId } },
      ],
    }, select: { id: true },
  }) ?? await prisma.projectProposal.findFirst({
    where: {
      status: "accepted",
      OR: [
        { authorId: userId, project: { ownerId: input.userId } },
        { authorId: input.userId, project: { ownerId: userId } },
      ],
    }, select: { id: true },
  });

  const targetProfile = connection?.status === "accepted" || acceptedCollaboration
    ? true
    : await prisma.user.findFirst({
        where: {
          id: input.userId,
          onboardedAt: { not: null },
          profile: { is: { visibility: { in: ["public", "members"] } } },
        },
        select: { id: true },
      });

  if (
    !targetProfile ||
    (connection && connection.status !== "accepted" && targetProfile === true && !acceptedCollaboration)
  ) {
    throw new AppError(
      404,
      "USER_NOT_AVAILABLE",
      "This profile is not available for messaging.",
    );
  }

  let conversationId: string;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: pair,
        select: { id: true },
      });

      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, userId: pair.userLowId },
          { conversationId: conversation.id, userId: pair.userHighId },
        ],
      });

      return conversation;
    });
    conversationId = created.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.conversation.findUnique({
        where: { userLowId_userHighId: pair },
        select: { id: true },
      });
      if (!raced) throw error;
      conversationId = raced.id;
    } else {
      throw error;
    }
  }

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { archivedAt: null },
  });

  const result = await getConversation(conversationId, userId);
  for (const recipientId of [pair.userLowId, pair.userHighId]) {
    publishToUser(recipientId, "conversation.created", {
      conversationId,
    });
  }
  return result;
}

export async function listConversations(
  userId: string,
  query: ConversationListQuery,
) {
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId);
  const membershipWhere: Prisma.ConversationWhereInput = {
    participants: {
      some: {
        userId,
        archivedAt: query.archived ? { not: null } : null,
      },
    },
    ...(blockedIds.length ? { NOT: [{ userLowId: userId, userHighId: { in: blockedIds } }, { userHighId: userId, userLowId: { in: blockedIds } }] } : {}),
  };

  let cursorConversation: { id: string; updatedAt: Date } | null = null;
  if (query.cursor) {
    cursorConversation = await prisma.conversation.findFirst({
      where: { AND: [membershipWhere, { id: query.cursor }] },
      select: { id: true, updatedAt: true },
    });
    if (!cursorConversation) throw notFound();
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      AND: [
        membershipWhere,
        ...(cursorConversation
          ? [
              {
                OR: [
                  { updatedAt: { lt: cursorConversation.updatedAt } },
                  {
                    updatedAt: cursorConversation.updatedAt,
                    id: { lt: cursorConversation.id },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    include: conversationInclude,
  });

  const hasMore = conversations.length > query.limit;
  const page = conversations.slice(0, query.limit);

  return {
    data: await Promise.all(page.map((row) => formatConversation(row, userId))),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getConversation(conversationId: string, userId: string) {
  const row = await findConversationRow(conversationId, userId);
  return formatConversation(row, userId);
}

export async function listConversationCalls(conversationId: string, userId: string) {
  await findConversationRow(conversationId, userId);
  const calls = await prisma.callSession.findMany({
    where: { conversationId }, orderBy: { createdAt: "desc" }, take: 20,
    select: { id: true, mode: true, status: true, createdAt: true, endedAt: true, createdById: true, participants: { select: { userId: true, status: true, joinedAt: true } } },
  });
  return calls.map((call) => {
    const otherParticipant = call.participants.find((participant) => participant.userId !== call.createdById);
    const answered = Boolean(otherParticipant?.joinedAt);
    const outcome = call.status === "active" ? "ringing" : answered ? "completed" : otherParticipant?.status === "declined" ? "declined" : "missed";
    return {
      id: call.id,
      mode: call.mode,
      status: call.status,
      direction: call.createdById === userId ? "outgoing" : "incoming",
      outcome,
      createdAt: call.createdAt.toISOString(),
      endedAt: call.endedAt?.toISOString() ?? null,
    };
  });
}

export async function getMessageHistory(
  conversationId: string,
  userId: string,
  query: MessageListQuery,
) {
  const conversation = await findConversationRow(conversationId, userId);

  const otherParticipant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: userId } },
    select: { lastReadAt: true },
  });

  let cursorMessage: { id: string; createdAt: Date } | null = null;
  if (query.cursor) {
    cursorMessage = await prisma.message.findFirst({
      where: { id: query.cursor, conversationId },
      select: { id: true, createdAt: true },
    });
    if (!cursorMessage) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
    }
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(conversation.userLowId === userId
        ? { deletedForLowAt: null }
        : { deletedForHighAt: null }),
      ...(cursorMessage
        ? {
            OR: [
              { createdAt: { lt: cursorMessage.createdAt } },
              {
                createdAt: cursorMessage.createdAt,
                id: { lt: cursorMessage.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    select: messageSelect,
  });

  const hasMore = messages.length > query.limit;
  const page = messages.slice(0, query.limit);

  return {
    data: page
      .reverse()
      .map((message) =>
        formatMessage(message, otherParticipant?.lastReadAt ?? null, userId),
      ),
    nextCursor: hasMore ? (messages[query.limit - 1]?.id ?? null) : null,
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: CreateMessageInput,
) {
  const conversation = await findConversationRow(conversationId, senderId);
  const recipientId =
    conversation.userLowId === senderId
      ? conversation.userHighId
      : conversation.userLowId;
  const recipientMembership = conversation.participants.find(
    (participant) => participant.userId === recipientId,
  );
  if (input.replyToMessageId) {
    const target = await prisma.message.findFirst({ where: { id: input.replyToMessageId, conversationId, deletedAt: null }, select: { id: true } });
    if (!target) throw new AppError(404, "MESSAGE_NOT_FOUND", "The message you are replying to is no longer available.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId,
        content: input.content,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        replyToId: input.replyToMessageId,
      },
      select: messageSelect,
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await tx.conversationParticipant.updateMany({
      where: { conversationId },
      data: { archivedAt: null },
    });

    await tx.notification.create({
      data: {
        recipientId,
        actorId: senderId,
        type: "message",
        message: "sent you a message.",
        resourceId: conversationId,
      },
    });

    return message;
  });

  const result = formatMessage(created, recipientMembership?.lastReadAt ?? null, senderId);
  for (const participantId of [conversation.userLowId, conversation.userHighId]) {
    publishToUser(participantId, "message.created", {
      conversationId,
      message: result,
    });
  }
  return result;
}

export async function toggleMessageReaction(conversationId: string, messageId: string, userId: string, emoji: string) {
  const conversation = await findConversationRow(conversationId, userId);
  const message = await prisma.message.findFirst({ where: { id: messageId, conversationId, deletedAt: null }, select: { id: true } });
  if (!message) throw new AppError(404, "MESSAGE_NOT_FOUND", "This message is no longer available.");
  const key = { messageId_userId_emoji: { messageId, userId, emoji } };
  const existing = await prisma.messageReaction.findUnique({ where: key, select: { messageId: true } });
  if (existing) await prisma.messageReaction.delete({ where: key });
  else await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
  const rows = await prisma.messageReaction.findMany({ where: { messageId }, select: { userId: true, emoji: true } });
  const summaries = [...rows.reduce((map, reaction) => {
    const value = map.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, reactedByMe: false };
    value.count += 1; value.reactedByMe ||= reaction.userId === userId; map.set(reaction.emoji, value); return map;
  }, new Map<string, { emoji: string; count: number; reactedByMe: boolean }>()).values()];
  for (const participantId of [conversation.userLowId, conversation.userHighId]) publishToUser(participantId, "message.reactions", { conversationId, messageId, reactions: summaries });
  return summaries;
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
) {
  const conversation = await findConversationRow(conversationId, userId);
  const readAt = new Date();

  await prisma.$transaction([
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: readAt },
    }),
    prisma.notification.updateMany({
      where: {
        recipientId: userId,
        type: "message",
        resourceId: conversationId,
        isRead: false,
      },
      data: { isRead: true },
    }),
  ]);

  const result = { conversationId, userId, readAt: readAt.toISOString() };
  for (const participantId of [conversation.userLowId, conversation.userHighId]) {
    publishToUser(participantId, "conversation.read", result);
  }
  return result;
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  userId: string,
  scope: "me" | "everyone",
) {
  const conversation = await findConversationRow(conversationId, userId);
  const deletedAt = new Date();

  if (scope === "me") {
    const hidden = await prisma.message.updateMany({
      where: { id: messageId, conversationId, deletedAt: null },
      data: conversation.userLowId === userId
        ? { deletedForLowAt: deletedAt }
        : { deletedForHighAt: deletedAt },
    });
    if (hidden.count !== 1) throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
    publishToUser(userId, "message.hidden", { conversationId, messageId });
    return;
  }

  const result = await prisma.message.updateMany({
    where: {
      id: messageId,
      conversationId,
      senderId: userId,
      deletedAt: null,
    },
      data: { content: "", mediaUrl: null, mediaType: null, deletedAt, deletedForLowAt: null, deletedForHighAt: null },
  });

  if (result.count !== 1) {
    throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: deletedAt },
  });

  const event = { conversationId, messageId, deletedAt: deletedAt.toISOString() };
  for (const participantId of [conversation.userLowId, conversation.userHighId]) {
    publishToUser(participantId, "message.deleted", event);
  }
}

export async function editMessage(conversationId: string, messageId: string, userId: string, content: string) {
  const conversation = await findConversationRow(conversationId, userId);
  const existing = await prisma.message.findFirst({ where: { id: messageId, conversationId, senderId: userId, deletedAt: null }, select: { createdAt: true } });
  if (!existing) throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
  if (Date.now() - existing.createdAt.getTime() > 15 * 60_000) throw new AppError(409, "MESSAGE_EDIT_EXPIRED", "Messages can only be edited for 15 minutes after sending.");
  const editedAt = new Date();
  const updated = await prisma.message.update({ where: { id: messageId }, data: { content, editedAt }, select: messageSelect });
  const recipientId = conversation.userLowId === userId ? conversation.userHighId : conversation.userLowId;
  const recipient = conversation.participants.find((item) => item.userId === recipientId);
  const result = formatMessage(updated, recipient?.lastReadAt ?? null, userId);
  for (const participantId of [conversation.userLowId, conversation.userHighId]) publishToUser(participantId, "message.updated", { conversationId, message: result });
  return result;
}

export async function archiveConversation(conversationId: string, userId: string) {
  await findConversationRow(conversationId, userId);
  const archivedAt = new Date();
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archivedAt },
  });
  return { conversationId, archivedAt: archivedAt.toISOString() };
}

export async function restoreConversation(conversationId: string, userId: string) {
  await findConversationRow(conversationId, userId);
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archivedAt: null },
  });
  return getConversation(conversationId, userId);
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "messages" AS message
    INNER JOIN "conversation_participants" AS participant
      ON participant."conversation_id" = message."conversation_id"
    INNER JOIN "conversations" AS conversation
      ON conversation."id" = message."conversation_id"
    WHERE participant."user_id" = ${userId}::uuid
      AND participant."archived_at" IS NULL
      AND message."sender_id" <> ${userId}::uuid
      AND message."deleted_at" IS NULL
      AND (
        participant."last_read_at" IS NULL
        OR message."created_at" > participant."last_read_at"
      )
      AND (
        (conversation."user_low_id" = ${userId}::uuid AND message."deleted_for_low_at" IS NULL)
        OR (conversation."user_high_id" = ${userId}::uuid AND message."deleted_for_high_at" IS NULL)
      )
  `;

  return Number(rows[0]?.count ?? 0n);
}
