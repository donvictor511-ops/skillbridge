import type { Response } from "express";

export type RealtimeEventName =
  | "message.created"
  | "message.updated"
  | "message.reactions"
  | "message.deleted"
  | "message.hidden"
  | "conversation.read"
  | "conversation.created"
  | "presence.changed"
  | "call.invite"
  | "call.signal"
  | "call.peer_joined"
  | "call.ended"
  | "call.message";

interface EventPayload {
  [key: string]: unknown;
}

const streamsByUser = new Map<string, Set<Response>>();

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
