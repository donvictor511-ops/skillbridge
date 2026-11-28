import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import type { NotificationType } from "../../generated/prisma/client";
import { AppError } from "../../utils/appError";
import { decryptDeviceToken, encryptDeviceToken, hashDeviceToken } from "./deviceTokenCrypto";
import { createPushDeliveryProcessor, type PushDeliveryStore } from "./pushDeliveryQueue";

const firebaseApp = (() => {
  if (!env.firebaseAdmin) return null;
  try {
    return getApps().find((app) => app.name === "skillbridge-push") ?? initializeApp({
      credential: cert(env.firebaseAdmin),
      projectId: env.firebaseAdmin.projectId,
    }, "skillbridge-push");
  } catch {
    console.warn("Firebase Admin credentials are invalid; browser push remains disabled.");
    return null;
  }
})();

const pushCategory = {
  post_like: "postLikes",
  post_comment: "comments",
  post_shared: "comments",
  message: "messages",
  connection_request: "connections",
  connection_accepted: "connections",
  follow: "connections",
  community_post: "groups",
  community_invite: "groups",
  job_application: "marketplace",
  job_application_update: "marketplace",
  project_proposal: "marketplace",
  project_proposal_update: "marketplace",
  interview_scheduled: "marketplace",
  interview_updated: "marketplace",
  moderation_report: "platformUpdates",
  account_appeal: "platformUpdates",
  account_appeal_update: "platformUpdates",
  content_moderation_case: "platformUpdates",
  content_moderation_update: "platformUpdates",
} as const satisfies Record<NotificationType, keyof NonNullable<Awaited<ReturnType<typeof getPreferences>>>>;

async function getPreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

function notificationLink(type: NotificationType, resourceId: string | null): string {
  if (type === "message" && resourceId) return `/messages?conversationId=${encodeURIComponent(resourceId)}`;
  if (type === "community_post" && resourceId) return `/communities?communityId=${encodeURIComponent(resourceId)}`;
  if (type === "moderation_report") return "/admin?section=reports";
  if (type === "account_appeal") return "/admin?section=appeals";
  if (type === "content_moderation_case") return "/admin?section=auto_review";
  if (type === "connection_request" || type === "connection_accepted") return "/connections";
  if ((type === "post_like" || type === "post_comment" || type === "post_shared") && resourceId) return `/posts#post-${encodeURIComponent(resourceId)}`;
  return "/posts";
}

const pushDeliveryStore: PushDeliveryStore = {
  async claim(notificationId, recipientId) {
    const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
      UPDATE "notification_push_deliveries"
      SET "status" = 'processing',
          "attempts" = "attempts" + 1,
          "lease_until" = NOW() + INTERVAL '2 minutes',
          "retry_at" = NULL,
          "last_error" = NULL
      WHERE "notification_id" = ${notificationId}::uuid
        AND "recipient_id" = ${recipientId}::uuid
        AND (
          "status" = 'pending'
          OR ("status" = 'retry' AND "retry_at" <= NOW())
          OR ("status" = 'processing' AND "lease_until" <= NOW())
        )
      RETURNING "attempts"
    `;
    return rows[0] ? { notificationId, recipientId, attempts: rows[0].attempts } : null;
  },
  async complete(notificationId, status) {
    await prisma.notificationPushDelivery.updateMany({
      where: { notificationId, status: "processing" },
      data: { status, processedAt: new Date(), leaseUntil: null, retryAt: null, lastError: null },
    });
  },
  async retry(notificationId, retryAt, error) {
    await prisma.notificationPushDelivery.updateMany({
      where: { notificationId, status: "processing" },
      data: { status: "retry", retryAt, leaseUntil: null, lastError: error },
    });
  },
};

async function sendPushNotification(notificationId: string, recipientId: string): Promise<"sent" | "skipped"> {
  if (!firebaseApp || !env.firebaseDeviceTokenEncryptionKey) return "skipped";
  const [notification, preferences, devices] = await Promise.all([
    prisma.notification.findFirst({
      where: { id: notificationId, recipientId },
      select: { id: true, type: true, message: true, resourceId: true, actor: { select: { profile: { select: { displayName: true } } } } },
    }),
    getPreferences(recipientId),
    prisma.notificationDevice.findMany({ where: { userId: recipientId }, select: { id: true, encryptedToken: true } }),
  ]);
  if (!notification || !preferences.pushEnabled || !preferences[pushCategory[notification.type]] || !devices.length) return "skipped";

  const actorName = notification.actor.profile?.displayName;
  const body = (actorName ? `${actorName} ${notification.message}` : notification.message).slice(0, 240);
  const url = notificationLink(notification.type, notification.resourceId);
  const messaging = getMessaging(firebaseApp);
  const retryableErrors: string[] = [];
  const permanentErrors = new Set([
    "messaging/invalid-argument",
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered",
    "messaging/mismatched-credential",
    "messaging/authentication-error",
    "messaging/permission-denied",
  ]);
  for (let offset = 0; offset < devices.length; offset += 500) {
    const batch = devices.slice(offset, offset + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map((device) => decryptDeviceToken(device.encryptedToken, env.firebaseDeviceTokenEncryptionKey!)),
      notification: { title: "SkillBridge", body },
      data: { url, notificationId: notification.id },
      webpush: { notification: { tag: notification.id, renotify: false } },
    });
    const expired = batch.filter((_device, index) => {
      const code = result.responses[index]?.error?.code;
      return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
    }).map((device) => device.id);
    if (expired.length) await prisma.notificationDevice.deleteMany({ where: { id: { in: expired }, userId: recipientId } });
    for (const response of result.responses) {
      const code = response.error?.code;
      if (code && !permanentErrors.has(code)) retryableErrors.push(code);
    }
  }
  if (retryableErrors.length) throw new Error([...new Set(retryableErrors)].join(","));
  return "sent";
}

const processPushDelivery = createPushDeliveryProcessor(pushDeliveryStore, async (claim) => {
  try {
    return await sendPushNotification(claim.notificationId, claim.recipientId);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : error instanceof Error && /^messaging\/[a-z-]+(,messaging\/[a-z-]+)*$/.test(error.message)
        ? error.message
        : "messaging/delivery-failed";
    throw new Error(code);
  }
});

export async function deliverPushNotification(notificationId: string, recipientId: string): Promise<void> {
  const processed = await processPushDelivery(notificationId, recipientId);
  if (!processed) console.warn("FCM notification delivery was deferred or is already being processed.");
}

export async function processDuePushNotifications(): Promise<void> {
  const now = new Date();
  const due = await prisma.notificationPushDelivery.findMany({
    where: {
      OR: [
        { status: "pending" },
        { status: "retry", retryAt: { lte: now } },
        { status: "processing", leaseUntil: { lte: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { notificationId: true, recipientId: true },
  });
  for (let offset = 0; offset < due.length; offset += 10) {
    await Promise.all(due.slice(offset, offset + 10).map(({ notificationId, recipientId }) => processPushDelivery(notificationId, recipientId)));
  }
}

export async function getFirebaseWebConfig() {
  return firebaseApp && env.firebaseWeb && env.firebaseVapidKey && env.firebaseDeviceTokenEncryptionKey && env.firebaseAdmin?.projectId === env.firebaseWeb.projectId
    ? { ...env.firebaseWeb, vapidKey: env.firebaseVapidKey }
    : null;
}

export async function registerNotificationDevice(userId: string, token: string, label: string) {
  const key = env.firebaseDeviceTokenEncryptionKey;
  if (!key) throw new AppError(503, "PUSH_NOT_CONFIGURED", "Browser push notifications are not configured yet.");
  const tokenHash = hashDeviceToken(token);
  const encryptedToken = encryptDeviceToken(token, key);

  const existing = await prisma.notificationDevice.findUnique({ where: { tokenHash } });
  if (existing && existing.userId !== userId) {
    throw new AppError(409, "PUSH_DEVICE_IN_USE", "This browser registration is already linked to another account.");
  }
  if (existing) {
    return prisma.notificationDevice.update({
      where: { id: existing.id },
      data: { encryptedToken, label, lastSeenAt: new Date() },
      select: { id: true, label: true, createdAt: true, lastSeenAt: true },
    });
  }

  try {
    return await prisma.notificationDevice.create({
      data: { userId, tokenHash, encryptedToken, label },
      select: { id: true, label: true, createdAt: true, lastSeenAt: true },
    });
  } catch (error) {
    const winner = await prisma.notificationDevice.findUnique({ where: { tokenHash } });
    if (!winner) throw error;
    if (winner.userId !== userId) {
      throw new AppError(409, "PUSH_DEVICE_IN_USE", "This browser registration is already linked to another account.");
    }
    return prisma.notificationDevice.update({
      where: { id: winner.id },
      data: { encryptedToken, label, lastSeenAt: new Date() },
      select: { id: true, label: true, createdAt: true, lastSeenAt: true },
    });
  }
}

export async function listNotificationDevices(userId: string) {
  return prisma.notificationDevice.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, label: true, createdAt: true, lastSeenAt: true },
  });
}

export async function removeNotificationDevice(userId: string, deviceId: string) {
  await prisma.notificationDevice.deleteMany({ where: { id: deviceId, userId } });
}
