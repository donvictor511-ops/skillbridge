import { randomUUID } from "node:crypto";
import { prismaPresenceStore } from "./presence.repository";
import {
  createPresenceService,
  PRESENCE_CLEANUP_INTERVAL_MS,
} from "./presence.service";
import { listPresencePeerIds } from "./presencePeers";
import { publishPresenceToUser } from "./messages.realtime";

const presence = createPresenceService(prismaPresenceStore);
let cleanupTimer: NodeJS.Timeout | null = null;
let cleanupRunning = false;

async function broadcastPresence(userId: string, isOnline: boolean): Promise<void> {
  const peerIds = await listPresencePeerIds(userId);
  await Promise.all(peerIds.map((peerId) => publishPresenceToUser(peerId, userId, isOnline)));
}

export function newPresenceSessionId(): string {
  return randomUUID();
}

export async function registerPresenceSession(sessionId: string, userId: string): Promise<void> {
  if (await presence.connect(sessionId, userId)) {
    try { await broadcastPresence(userId, true); }
    catch { console.warn("Could not broadcast a presence-online transition to peer sessions."); }
  }
}

export function refreshPresenceSession(sessionId: string, userId: string): Promise<boolean> {
  return presence.heartbeat(sessionId, userId);
}

export async function disconnectPresenceSession(sessionId: string): Promise<void> {
  const offlineUserId = await presence.disconnect(sessionId);
  if (offlineUserId) {
    try { await broadcastPresence(offlineUserId, false); }
    catch { console.warn("Could not broadcast a presence-offline transition to peer sessions."); }
  }
}

export async function endPresenceSession(sessionId: string, userId: string): Promise<boolean> {
  const refreshed = await presence.heartbeat(sessionId, userId);
  if (!refreshed) return false;
  await disconnectPresenceSession(sessionId);
  return true;
}

export function isUserOnline(userId: string): Promise<boolean> {
  return presence.isOnline(userId);
}

export async function onlineUserIds(userIds: string[]): Promise<Set<string>> {
  return new Set(await presence.onlineUserIds(userIds));
}

export async function expireStalePresenceSessions(): Promise<void> {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const offlineUsers = await presence.expireStaleSessions();
    await Promise.all(offlineUsers.map(async (userId) => {
      try { await broadcastPresence(userId, false); }
      catch { console.warn("Could not broadcast an expired presence transition to peer sessions."); }
    }));
  } finally {
    cleanupRunning = false;
  }
}

export function startPresenceMaintenance(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    void expireStalePresenceSessions().catch(() => {
      console.warn("Presence cleanup failed; stale sessions will be retried.");
    });
  }, PRESENCE_CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

export function stopPresenceMaintenance(): void {
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = null;
}
