import type { Response } from "express";
import { Client } from "pg";
import { env } from "../../config/env";
import { deliverPushNotification } from "../notifications/push.service";

export type RealtimeEventName =
  | "message.created"
  | "message.updated"
  | "message.reactions"
  | "message.deleted"
  | "message.hidden"
  | "conversation.read"
  | "conversation.created"
  | "presence.changed"
  | "message.typing"
  | "call.invite"
  | "call.signal"
  | "call.peer_joined"
  | "call.ended"
  | "call.message"
  | "notification.created";

interface EventPayload {
  [key: string]: unknown;
}

const streamsByUser = new Map<string, Set<Response>>();
let listenerClient: Client | null = null;
let retryTimer: NodeJS.Timeout | null = null;
let listenerStarted = false;

export function startNotificationEventListener(): void {
  if (listenerStarted) return;
  listenerStarted = true;
  void connectNotificationListener();
}

async function connectNotificationListener(): Promise<void> {
  const client = new Client({ connectionString: env.databaseUrl });
  listenerClient = client;
  client.on("notification", (event) => {
    if (event.channel === "skillbridge_notification" && event.payload) {
      try {
        const payload: unknown = JSON.parse(event.payload);
        if (payload && typeof payload === "object" && "notificationId" in payload && "recipientId" in payload && typeof payload.notificationId === "string" && typeof payload.recipientId === "string") {
          publishToUser(payload.recipientId, "notification.created", {});
          void deliverPushNotification(payload.notificationId, payload.recipientId).catch(() => {
            console.warn("FCM notification delivery failed; the originating request was unaffected.");
          });
        }
      } catch {
        // Ignore malformed database notifications and keep the SSE listener alive.
      }
    }
  });
  client.on("error", () => {
    if (listenerClient !== client) return;
    listenerClient = null;
    void client.end().catch(() => undefined);
    scheduleNotificationReconnect();
  });

  try {
    await client.connect();
    await client.query("LISTEN skillbridge_notification");
  } catch {
    if (listenerClient === client) listenerClient = null;
    void client.end().catch(() => undefined);
    scheduleNotificationReconnect();
  }
}

function scheduleNotificationReconnect(): void {
  if (!listenerStarted || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void connectNotificationListener();
  }, 5000);
  retryTimer.unref();
}

function writeEvent(
  response: Response,
  name: RealtimeEventName,
  payload: EventPayload,
): void {
  if (!response.writableEnded && !response.destroyed) {
    response.write(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);
  }
}

export function addEventStream(userId: string, response: Response): boolean {
  let streams = streamsByUser.get(userId);
  const becameOnline = !streams;

  if (!streams) {
    streams = new Set<Response>();
    streamsByUser.set(userId, streams);
  }

  streams.add(response);
  return becameOnline;
}

export function removeEventStream(userId: string, response: Response): boolean {
  const streams = streamsByUser.get(userId);
  if (!streams) return false;

  streams.delete(response);
  if (streams.size > 0) return false;

  streamsByUser.delete(userId);
  return true;
}

export function isUserOnline(userId: string): boolean {
  return (streamsByUser.get(userId)?.size ?? 0) > 0;
}

export function sendEvent(
  response: Response,
  name: RealtimeEventName,
  payload: EventPayload,
): void {
  writeEvent(response, name, payload);
}

export function publishToUser(
  userId: string,
  name: RealtimeEventName,
  payload: EventPayload,
): void {
  for (const response of streamsByUser.get(userId) ?? []) {
    writeEvent(response, name, payload);
  }
}
