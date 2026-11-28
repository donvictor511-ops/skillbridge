export interface PushDeliveryClaim {
  notificationId: string;
  recipientId: string;
  attempts: number;
}

export interface PushDeliveryStore {
  claim(notificationId: string, recipientId: string): Promise<PushDeliveryClaim | null>;
  complete(notificationId: string, status: "sent" | "skipped"): Promise<void>;
  retry(notificationId: string, retryAt: Date, error: string): Promise<void>;
}

export type PushDeliveryResult = "sent" | "skipped";

export function createPushDeliveryProcessor(
  store: PushDeliveryStore,
  deliver: (claim: PushDeliveryClaim) => Promise<PushDeliveryResult>,
  now: () => Date = () => new Date(),
) {
  return async function process(notificationId: string, recipientId: string): Promise<boolean> {
    const claim = await store.claim(notificationId, recipientId);
    if (!claim) return false;

    try {
      await store.complete(notificationId, await deliver(claim));
      return true;
    } catch (error) {
      const delayMs = Math.min(60 * 60_000, 30_000 * (2 ** Math.min(claim.attempts - 1, 7)));
      const message = error instanceof Error ? error.message : "Unknown push delivery error.";
      await store.retry(notificationId, new Date(now().getTime() + delayMs), message.slice(0, 500));
      return false;
    }
  };
}
