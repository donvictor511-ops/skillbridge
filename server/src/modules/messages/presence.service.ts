export const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;
export const PRESENCE_SESSION_TIMEOUT_MS = 120_000;
export const PRESENCE_CLEANUP_INTERVAL_MS = 30_000;

export interface PresenceStore {
  connect(sessionId: string, userId: string, now: Date, staleBefore: Date): Promise<boolean>;
  heartbeat(sessionId: string, userId: string, now: Date): Promise<boolean>;
  disconnect(sessionId: string, staleBefore: Date): Promise<string | null>;
  onlineUserIds(userIds: string[], staleBefore: Date): Promise<string[]>;
  expireStale(staleBefore: Date): Promise<string[]>;
}

export function createPresenceService(store: PresenceStore, clock: () => Date = () => new Date()) {
  const staleBefore = () => new Date(clock().getTime() - PRESENCE_SESSION_TIMEOUT_MS);

  return {
    connect(sessionId: string, userId: string) {
      const now = clock();
      return store.connect(sessionId, userId, now, new Date(now.getTime() - PRESENCE_SESSION_TIMEOUT_MS));
    },

    heartbeat(sessionId: string, userId: string) {
      return store.heartbeat(sessionId, userId, clock());
    },

    disconnect(sessionId: string) {
      return store.disconnect(sessionId, staleBefore());
    },

    isOnline(userId: string) {
      return store.onlineUserIds([userId], staleBefore()).then((ids) => ids.includes(userId));
    },

    onlineUserIds(userIds: string[]) {
      return store.onlineUserIds([...new Set(userIds)], staleBefore());
    },

    expireStaleSessions() {
      return store.expireStale(staleBefore());
    },
  };
}
