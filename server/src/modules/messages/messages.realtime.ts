import type { Response } from "express";
import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { deliverPushNotification, processDuePushNotifications } from "../notifications/push.service";

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
  | "notification.created"
  | "presence.session";

interface EventPayload {
  [key: string]: unknown;
}

const streamsByUser = new Map<string, Set<Response>>();
const realtimeInstanceId = randomUUID();
let listenerClient: Client | null = null;
let retryTimer: NodeJS.Timeout | null = null;
let listenerStarted = false;
let pushWorkerTimer: NodeJS.Timeout | null = null;
let pushWorkerRunning = false;

function handleDatabaseEvent(channel: string, payloadText: string): void {
  let payload: unknown;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return;
  }
  if (!payload || typeof payload !== "object") return;
  const value = payload as Record<string, unknown>;

  if (channel === "skillbridge_notification" && typeof value.notificationId === "string" && typeof value.recipientId === "string") {
    publishToUser(value.recipientId, "notification.created", {});
    void deliverPushNotification(value.notificationId, value.recipientId).catch(() => {
      console.warn("FCM notification event failed; the durable delivery queue will retry it.");
    });
    return;
  }

  if (channel === "skillbridge_presence" && value.origin !== realtimeInstanceId && typeof value.recipientId === "string" && typeof value.userId === "string" && typeof value.isOnline === "boolean") {
    publishToUser(value.recipientId, "presence.changed", { userId: value.userId, isOnline: value.isOnline });
  }
}

export function startNotificationEventListener(): void {
  if (listenerStarted) return;
  listenerStarted = true;
  void connectNotificationListener();
  pushWorkerTimer = setInterval(() => {
    if (pushWorkerRunning) return;
    pushWorkerRunning = true;
    void processDuePushNotifications()
      .catch(() => console.warn("FCM delivery queue poll failed; it will retry."))
      .finally(() => { pushWorkerRunning = false; });
  }, 15000);
  pushWorkerTimer.unref();
}

async function connectNotificationListener(): Promise<void> {
  const client = new Client({ connectionString: env.databaseUrl });
  listenerClient = client;
  client.on("notification", (event) => {
    if (event.payload) handleDatabaseEvent(event.channel, event.payload);
  });
  const reconnect = () => {
    if (listenerClient !== client) return;
    listenerClient = null;
    void client.end().catch(() => undefined);
    scheduleNotificationReconnect();
  };
  client.on("error", reconnect);
  client.on("end", reconnect);

  try {
    await client.connect();
    await client.query("LISTEN skillbridge_notification");
    await client.query("LISTEN skillbridge_presence");
  } catch {
    if (listenerClient === client) listenerClient = null;
    void client.end().catch(() => undefined);
    scheduleNotificationReconnect();
  }
}

export function stopNotificationEventListener(): void {
  listenerStarted = false;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  if (pushWorkerTimer) clearInterval(pushWorkerTimer);
  pushWorkerTimer = null;
  const client = listenerClient;
  listenerClient = null;
  if (client) void client.end().catch(() => undefined);
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

export async function publishPresenceToUser(recipientId: string, userId: string, isOnline: boolean): Promise<void> {
  publishToUser(recipientId, "presence.changed", { userId, isOnline });
  const payload = JSON.stringify({ recipientId, userId, isOnline, origin: realtimeInstanceId });
  try {
    await prisma.$queryRaw`SELECT pg_notify('skillbridge_presence', ${payload})`;
  } catch {
    console.warn("Cross-instance presence broadcast failed; sent to local sessions only.");
  }
}
