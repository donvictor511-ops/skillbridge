import assert from "node:assert/strict";
import test from "node:test";
import {
  createPresenceService,
  PRESENCE_SESSION_TIMEOUT_MS,
  type PresenceStore,
} from "./presence.service";

interface Session { id: string; userId: string; lastSeenAt: Date; }

function createMemoryStore() {
  const sessions = new Map<string, Session>();
  const store: PresenceStore = {
    async connect(id, userId, now, staleBefore) {
      const wasOnline = [...sessions.values()].some((session) => session.userId === userId && session.lastSeenAt > staleBefore);
      sessions.set(id, { id, userId, lastSeenAt: now });
      return !wasOnline;
    },
    async heartbeat(id, userId, now) {
      const session = sessions.get(id);
      if (!session || session.userId !== userId) return false;
      session.lastSeenAt = now;
      return true;
    },
    async disconnect(id, staleBefore) {
      const session = sessions.get(id);
      if (!session) return null;
      sessions.delete(id);
      return [...sessions.values()].some((active) => active.userId === session.userId && active.lastSeenAt > staleBefore)
        ? null
        : session.userId;
    },
    async onlineUserIds(userIds, staleBefore) {
      const requested = new Set(userIds);
      return [...new Set([...sessions.values()]
        .filter((session) => requested.has(session.userId) && session.lastSeenAt > staleBefore)
        .map((session) => session.userId))];
    },
    async expireStale(staleBefore) {
      const userIds = new Set<string>();
      for (const [id, session] of sessions) {
        if (session.lastSeenAt <= staleBefore) {
          userIds.add(session.userId);
          sessions.delete(id);
        }
      }
      return [...userIds].filter((userId) => ![...sessions.values()].some((session) => session.userId === userId));
    },
  };
  return { store, sessions };
}

test("first session marks online and the final disconnect marks offline", async () => {
  let now = new Date("2026-11-28T10:00:00Z");
  const { store } = createMemoryStore();
  const presence = createPresenceService(store, () => now);

  assert.equal(await presence.connect("tab-a", "user-a"), true);
  assert.equal(await presence.isOnline("user-a"), true);
  assert.equal(await presence.disconnect("tab-a"), "user-a");
  assert.equal(await presence.isOnline("user-a"), false);
  now = new Date(now.getTime() + 1);
});

test("closing one of several tabs leaves the user online until the last session closes", async () => {
  const { store } = createMemoryStore();
  const presence = createPresenceService(store);

  assert.equal(await presence.connect("tab-a", "user-a"), true);
  assert.equal(await presence.connect("tab-b", "user-a"), false);
  assert.equal(await presence.disconnect("tab-a"), null);
  assert.equal(await presence.isOnline("user-a"), true);
  assert.equal(await presence.disconnect("tab-b"), "user-a");
  assert.equal(await presence.isOnline("user-a"), false);
});

test("a heartbeat refreshes a live session and prevents stale expiry", async () => {
  let now = new Date("2026-11-28T10:00:00Z");
  const { store, sessions } = createMemoryStore();
  const presence = createPresenceService(store, () => now);
  await presence.connect("tab-a", "user-a");

  now = new Date(now.getTime() + PRESENCE_SESSION_TIMEOUT_MS - 1);
  assert.equal(await presence.heartbeat("tab-a", "user-a"), true);
  assert.deepEqual(await presence.expireStaleSessions(), []);
  assert.equal(await presence.isOnline("user-a"), true);
  assert.equal(sessions.get("tab-a")?.lastSeenAt.getTime(), now.getTime());
});

test("stale sessions expire and only mark a user offline after every tab is stale", async () => {
  let now = new Date("2026-11-28T10:00:00Z");
  const { store } = createMemoryStore();
  const presence = createPresenceService(store, () => now);
  await presence.connect("tab-a", "user-a");
  now = new Date(now.getTime() + 30_000);
  await presence.connect("tab-b", "user-a");

  now = new Date(now.getTime() + PRESENCE_SESSION_TIMEOUT_MS - 30_000);
  assert.deepEqual(await presence.expireStaleSessions(), []);
  assert.equal(await presence.isOnline("user-a"), true);

  now = new Date(now.getTime() + 30_001);
  assert.deepEqual(await presence.expireStaleSessions(), ["user-a"]);
  assert.equal(await presence.isOnline("user-a"), false);
});

test("sessions belonging to different users are isolated", async () => {
  const { store } = createMemoryStore();
  const presence = createPresenceService(store);
  await presence.connect("tab-a", "user-a");
  await presence.connect("tab-b", "user-b");

  assert.deepEqual(await presence.onlineUserIds(["user-b", "user-a", "user-a"]), ["user-a", "user-b"]);
  assert.equal(await presence.disconnect("tab-a"), "user-a");
  assert.equal(await presence.isOnline("user-b"), true);
});
