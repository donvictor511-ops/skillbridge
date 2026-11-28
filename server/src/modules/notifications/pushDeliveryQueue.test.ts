import assert from "node:assert/strict";
import test from "node:test";
import {
  createPushDeliveryProcessor,
  type PushDeliveryClaim,
  type PushDeliveryStore,
} from "./pushDeliveryQueue";

function createStore() {
  const states = new Map<string, { status: string; attempts: number; retryAt?: Date; error?: string }>();
  const store: PushDeliveryStore = {
    async claim(notificationId, recipientId) {
      const current = states.get(notificationId) ?? { status: "pending", attempts: 0 };
      if (current.status !== "pending" && current.status !== "retry") return null;
      current.status = "processing";
      current.attempts += 1;
      states.set(notificationId, current);
      return { notificationId, recipientId, attempts: current.attempts };
    },
    async complete(notificationId, status) {
      const current = states.get(notificationId);
      assert.ok(current);
      current.status = status;
    },
    async retry(notificationId, retryAt, error) {
      const current = states.get(notificationId);
      assert.ok(current);
      current.status = "retry";
      current.retryAt = retryAt;
      current.error = error;
    },
  };
  return { store, states };
}

test("concurrent event deliveries claim and send a notification only once", async () => {
  const { store, states } = createStore();
  let sendCount = 0;
  const process = createPushDeliveryProcessor(store, async (_claim: PushDeliveryClaim) => {
    sendCount += 1;
    await Promise.resolve();
    return "sent";
  });

  const results = await Promise.all([
    process("notification-a", "user-a"),
    process("notification-a", "user-a"),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(sendCount, 1);
  assert.equal(states.get("notification-a")?.status, "sent");
});

test("transient push errors are retried with backoff without exposing token data", async () => {
  const { store, states } = createStore();
  const now = new Date("2026-11-28T10:00:00Z");
  const process = createPushDeliveryProcessor(store, async () => {
    throw new Error("messaging/unavailable");
  }, () => now);

  assert.equal(await process("notification-a", "user-a"), false);
  assert.equal(states.get("notification-a")?.status, "retry");
  assert.equal(states.get("notification-a")?.retryAt?.getTime(), now.getTime() + 30_000);
  assert.equal(states.get("notification-a")?.error, "messaging/unavailable");
});

test("notifications with push disabled are recorded as skipped", async () => {
  const { store, states } = createStore();
  const process = createPushDeliveryProcessor(store, async () => "skipped");

  assert.equal(await process("notification-a", "user-a"), true);
  assert.equal(states.get("notification-a")?.status, "skipped");
});
