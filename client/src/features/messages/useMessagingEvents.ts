import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiBaseURL } from "../../services/apiClient";
import { messageKeys } from "./messagesQueries";

const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;

interface PresenceSessionPayload {
  sessionId: string;
}

export function useMessagingEvents(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let sessionId: string | null = null;
    let heartbeatTimer: number | null = null;
    let disposed = false;

    const refresh = () => {
      void qc.invalidateQueries({ queryKey: messageKeys.root });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    };

    const postHeartbeat = async (id: string, ended = false, keepalive = false): Promise<Response | null> => {
      try {
        return await fetch(`${apiBaseURL}/messages/presence/heartbeat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id, ...(ended ? { ended: true } : {}) }),
          keepalive,
        });
      } catch {
        // A later heartbeat retries transient network failures; the server expires stale sessions.
        return null;
      }
    };

    const restartConnection = () => {
      if (disposed) return;
      stopHeartbeat();
      sessionId = null;
      source?.close();
      source = null;
      connect();
    };

    const connect = () => {
      if (disposed || source) return;
      const connection = new EventSource(`${apiBaseURL}/messages/events`, { withCredentials: true });
      source = connection;

      ["message.created", "message.updated", "message.reactions", "message.deleted", "message.hidden", "conversation.read", "conversation.created", "presence.changed", "notification.created"]
        .forEach((event) => connection.addEventListener(event, refresh));

      connection.addEventListener("presence.session", (event) => {
        if (source !== connection) return;
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as PresenceSessionPayload;
          if (!payload.sessionId) return;
          sessionId = payload.sessionId;
          stopHeartbeat();
          const activeSessionId = payload.sessionId;
          const send = async () => {
            const response = await postHeartbeat(activeSessionId);
            if (response?.status === 410 && source === connection) restartConnection();
          };
          void send();
          heartbeatTimer = window.setInterval(() => void send(), PRESENCE_HEARTBEAT_INTERVAL_MS);
        } catch {
          // Ignore malformed session metadata and let EventSource reconnect.
        }
      });

      connection.addEventListener("message.typing", (event) => {
        try {
          const detail = JSON.parse((event as MessageEvent<string>).data) as { conversationId: string; userId: string; isTyping: boolean };
          window.dispatchEvent(new CustomEvent("skillbridge:message-typing", { detail }));
        } catch { /* Ignore malformed transient typing events. */ }
      });
    };

    const handlePageHide = () => {
      if (sessionId) void postHeartbeat(sessionId, true, true);
      stopHeartbeat();
      source?.close();
      source = null;
      sessionId = null;
    };

    const handlePageShow = () => connect();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && sessionId) void postHeartbeat(sessionId);
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    connect();

    return () => {
      disposed = true;
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sessionId) void postHeartbeat(sessionId, true, true);
      stopHeartbeat();
      source?.close();
      source = null;
      sessionId = null;
    };
  }, [enabled, qc]);
}
