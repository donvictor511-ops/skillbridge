import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { isUserOnline, publishToUser } from "../messages/messages.realtime";
import { usersHaveBlockedEachOther } from "../profiles/profile.blocking";

type CallKind = "direct" | "community" | "interview";
type CallMode = "audio" | "video";
const fail = (status: number, code: string, message: string) => new AppError(status, code, message);

const callInclude = {
  createdBy: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
  community: { select: { id: true, name: true } },
  interview: { select: { id: true, scheduledAt: true, durationMinutes: true, mode: true, application: { select: { job: { select: { title: true, ownerId: true } } } } } },
  participants: { include: { user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } } },
} as const;

function serializeCall(call: Awaited<ReturnType<typeof loadCall>>) {
  return {
    id: call.id, kind: call.kind, mode: call.mode, status: call.status, createdAt: call.createdAt.toISOString(), conversationId: call.conversationId,
    community: call.community,
    interview: call.interview ? { id: call.interview.id, scheduledAt: call.interview.scheduledAt.toISOString(), durationMinutes: call.interview.durationMinutes, mode: call.interview.mode, jobTitle: call.interview.application.job.title } : null,
    participants: call.participants.map((participant) => ({
      userId: participant.user.id,
      displayName: participant.user.profile?.displayName ?? "SkillBridge member",
      avatarUrl: participant.user.profile?.avatarUrl ?? null,
      status: participant.status,
      isOnline: isUserOnline(participant.user.id),
    })),
  };
}

async function loadCall(callId: string) {
  const call = await prisma.callSession.findUnique({ where: { id: callId }, include: callInclude });
  if (!call) throw fail(404, "CALL_NOT_FOUND", "Call room was not found.");
  return call;
}

async function requireCallParticipant(callId: string, userId: string) {
  const participant = await prisma.callParticipant.findUnique({ where: { callId_userId: { callId, userId } }, select: { status: true } });
  if (!participant) throw fail(403, "CALL_ACCESS_DENIED", "You are not invited to this call.");
  return participant;
}

function broadcast(callId: string, userIds: string[], event: "call.invite" | "call.peer_joined" | "call.signal" | "call.ended" | "call.message", payload: Record<string, unknown>) {
  for (const userId of new Set(userIds)) publishToUser(userId, event, { callId, ...payload });
}

export async function listCallMessages(callId: string, userId: string) {
  await requireCallParticipant(callId, userId);
  const rows = await prisma.callMessage.findMany({ where: { callId }, orderBy: { createdAt: "asc" }, take: 150, include: { sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } } });
  return rows.map((row) => ({ id: row.id, callId: row.callId, senderId: row.senderId, senderName: row.sender.profile?.displayName ?? "SkillBridge member", avatarUrl: row.sender.profile?.avatarUrl ?? null, content: row.content, mediaUrl: row.mediaUrl, mediaType: row.mediaType, createdAt: row.createdAt.toISOString() }));
}

export async function createCallMessage(callId: string, userId: string, input: { content: string; mediaUrl?: string; mediaType?: "image" | "video" | "audio" }) {
  const participant = await requireCallParticipant(callId, userId);
  if (participant.status !== "joined") throw fail(403, "CALL_ACCESS_DENIED", "Join this call before sending chat messages.");
  const row = await prisma.callMessage.create({ data: { callId, senderId: userId, content: input.content, mediaUrl: input.mediaUrl, mediaType: input.mediaType }, include: { sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } } });
  const message = { id: row.id, callId, senderId: row.senderId, senderName: row.sender.profile?.displayName ?? "SkillBridge member", avatarUrl: row.sender.profile?.avatarUrl ?? null, content: row.content, mediaUrl: row.mediaUrl, mediaType: row.mediaType, createdAt: row.createdAt.toISOString() };
  const call = await loadCall(callId);
  broadcast(callId, call.participants.filter((item) => item.userId !== userId && item.status === "joined").map((item) => item.userId), "call.message", { message });
  return message;
}

export async function createCall(userId: string, input: { kind: CallKind; mode: CallMode; conversationId?: string; communityId?: string; interviewId?: string }) {
  let participantIds: string[] = [userId];
  let where: { conversationId?: string; communityId?: string; interviewId?: string } = {};
  let communityName: string | null = null;
  if (input.kind === "direct" && input.conversationId) {
    const conversation = await prisma.conversation.findUnique({ where: { id: input.conversationId }, select: { userLowId: true, userHighId: true } });
    if (!conversation || ![conversation.userLowId, conversation.userHighId].includes(userId)) throw fail(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    const otherUserId = conversation.userLowId === userId ? conversation.userHighId : conversation.userLowId;
    if (await usersHaveBlockedEachOther(userId, otherUserId)) throw fail(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    participantIds = [conversation.userLowId, conversation.userHighId];
    where = { conversationId: input.conversationId };
  } else if (input.kind === "community" && input.communityId) {
    const members = await prisma.communityMember.findMany({ where: { communityId: input.communityId }, select: { userId: true, community: { select: { name: true } } } });
    if (!members.some((member) => member.userId === userId)) throw fail(403, "COMMUNITY_PERMISSION_DENIED", "Join this group before starting a call.");
    if (members.length > 200) throw fail(409, "CALL_GROUP_TOO_LARGE", "This group is too large for a direct group call. Use a scheduled meeting link for a larger event.");
    participantIds = members.map((member) => member.userId);
    communityName = members[0]?.community.name ?? null;
    where = { communityId: input.communityId };
  } else if (input.kind === "interview" && input.interviewId) {
    const interview = await prisma.interview.findUnique({ where: { id: input.interviewId }, include: { application: { select: { applicantId: true, job: { select: { ownerId: true } } } } } });
    if (!interview || interview.status !== "scheduled" || ![interview.application.applicantId, interview.application.job.ownerId].includes(userId)) throw fail(404, "INTERVIEW_NOT_AVAILABLE", "This interview is not available to your account.");
    participantIds = [interview.application.applicantId, interview.application.job.ownerId];
    where = { interviewId: interview.id };
  } else {
    throw fail(400, "CALL_TARGET_REQUIRED", "Choose a conversation, community, or interview.");
  }

  const now = new Date();
  const directActive = input.kind === "direct" && where.conversationId
    ? await prisma.callSession.findFirst({ where: { conversationId: where.conversationId, status: "active", createdAt: { gte: new Date(now.getTime() - 10 * 60_000) } }, select: { id: true } })
    : null;
  const communityActive = input.kind === "community" && where.communityId
    ? await prisma.callSession.findFirst({ where: { communityId: where.communityId, status: "active", createdAt: { gte: new Date(now.getTime() - 30 * 60_000) } }, orderBy: { createdAt: "desc" }, select: { id: true } })
    : null;
  const interviewActive = input.kind === "interview" && where.interviewId
    ? await prisma.callSession.findFirst({ where: { interviewId: where.interviewId, status: "active" }, select: { id: true } })
    : null;
  const existingId = directActive?.id ?? communityActive?.id ?? interviewActive?.id;
  if (existingId) {
    const call = await loadCall(existingId);
    const joinedCount = call.participants.filter((item) => item.status === "joined").length;
    if (input.kind !== "community" || joinedCount < 6) return serializeCall(call);
  }

  const call = await prisma.callSession.create({
    data: {
      kind: input.kind, mode: input.mode, createdById: userId, ...where,
      participants: { create: participantIds.map((id) => ({ userId: id, status: id === userId ? "joined" : "invited", ...(id === userId ? { joinedAt: now } : {}) })) },
    },
    include: callInclude,
  });
  const invitees = participantIds.filter((id) => id !== userId);
  broadcast(call.id, invitees, "call.invite", { mode: call.mode, kind: call.kind, communityName, conversationId: call.conversationId, caller: { userId, displayName: call.createdBy.profile?.displayName ?? "SkillBridge member" } });
  return serializeCall(call);
}

export async function getCall(callId: string, userId: string) {
  await requireCallParticipant(callId, userId);
  let call = await loadCall(callId);
  if (call.status === "active" && call.kind === "direct" && Date.now() - call.createdAt.getTime() > 10 * 60_000 && call.participants.filter((participant) => participant.status === "joined").length < 2) {
    await prisma.callSession.update({ where: { id: call.id }, data: { status: "ended", endedAt: new Date() } });
    broadcast(call.id, call.participants.map((participant) => participant.userId), "call.ended", { userId: call.createdById, reason: "unanswered" });
    call = await loadCall(callId);
  }
  return { ...serializeCall(call), iceServers: getIceServers() };
}

export async function joinCall(callId: string, userId: string) {
  const call = await loadCall(callId);
  if (call.status !== "active") throw fail(409, "CALL_ENDED", "This call has already ended.");
  await requireCallParticipant(callId, userId);
  if (call.kind === "community") {
    const joinedCount = call.participants.filter((participant) => participant.status === "joined" && participant.userId !== userId).length;
    if (joinedCount >= 5) throw fail(409, "CALL_FULL", "This community call already has six participants.");
  }
  if (call.participants.some((participant) => participant.userId === userId && participant.status === "joined")) return getCall(callId, userId);
  await prisma.callParticipant.update({ where: { callId_userId: { callId, userId } }, data: { status: "joined", joinedAt: new Date(), leftAt: null } });
  const peers = call.participants.filter((participant) => participant.userId !== userId && participant.status === "joined").map((participant) => participant.userId);
  broadcast(callId, peers, "call.peer_joined", { userId });
  return getCall(callId, userId);
}

export async function relaySignal(callId: string, fromUserId: string, toUserId: string, signal: Record<string, unknown>) {
  const call = await loadCall(callId);
  if (call.status !== "active") throw fail(409, "CALL_ENDED", "This call has already ended.");
  const [from, to] = await Promise.all([requireCallParticipant(callId, fromUserId), requireCallParticipant(callId, toUserId)]);
  if (from.status !== "joined" || to.status !== "joined") throw fail(409, "CALL_PEER_NOT_JOINED", "Both participants must join before connecting media.");
  broadcast(callId, [toUserId], "call.signal", { fromUserId, signal });
}

export async function leaveCall(callId: string, userId: string, decline = false) {
  const call = await loadCall(callId);
  const participant = await requireCallParticipant(callId, userId);
  if (call.status !== "active") return;
  await prisma.callParticipant.update({ where: { callId_userId: { callId, userId } }, data: { status: decline && participant.status === "invited" ? "declined" : "left", leftAt: new Date() } });
  const endsRoom = call.kind !== "community" || call.createdById === userId;
  const remaining = await prisma.callParticipant.count({ where: { callId, status: "joined", userId: { not: userId } } });
  if (endsRoom || remaining === 0) {
    await prisma.callSession.update({ where: { id: callId }, data: { status: "ended", endedAt: new Date() } });
    broadcast(callId, call.participants.filter((item) => item.userId !== userId).map((item) => item.userId), "call.ended", { userId });
  } else {
    broadcast(callId, call.participants.filter((item) => item.status === "joined" && item.userId !== userId).map((item) => item.userId), "call.peer_joined", { userId, left: true });
  }
}

export async function getActiveCommunityCall(communityId: string, userId: string) {
  const member = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId } }, select: { userId: true } });
  if (!member) throw fail(403, "COMMUNITY_PERMISSION_DENIED", "Join this group to view its calls.");
  const call = await prisma.callSession.findFirst({ where: { communityId, status: "active" }, orderBy: { createdAt: "desc" }, include: callInclude });
  if (!call || call.participants.filter((participant) => participant.status === "joined").length >= 6) return null;
  return serializeCall(call);
}

function getIceServers(): Array<{ urls: string | string[]; username?: string; credential?: string }> {
  const raw = process.env.WEBRTC_ICE_SERVERS;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((server) => typeof server === "object" && server !== null && "urls" in server)) return parsed as Array<{ urls: string | string[]; username?: string; credential?: string }>;
    } catch { /* Use the public STUN fallback when no valid server list is configured. */ }
  }
  return [{ urls: "stun:stun.l.google.com:19302" }];
}
