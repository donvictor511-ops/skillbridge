import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import type { NotificationType } from "../../generated/prisma/client";

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

export async function deliverPushNotification(notificationId: string, recipientId: string): Promise<void> {
  if (!firebaseApp) return;

  const [notification, preferences, devices] = await Promise.all([
    prisma.notification.findFirst({
      where: { id: notificationId, recipientId },
      select: { id: true, type: true, message: true, resourceId: true, actor: { select: { profile: { select: { displayName: true } } } } },
    }),
    getPreferences(recipientId),
    prisma.notificationDevice.findMany({ where: { userId: recipientId }, select: { id: true, token: true } }),
  ]);
  if (!notification || !preferences.pushEnabled || !preferences[pushCategory[notification.type]] || !devices.length) return;

  const actorName = notification.actor.profile?.displayName;
  const body = (actorName ? `${actorName} ${notification.message}` : notification.message).slice(0, 240);
  const url = notificationLink(notification.type, notification.resourceId);
  const messaging = getMessaging(firebaseApp);
  for (let offset = 0; offset < devices.length; offset += 500) {
    const batch = devices.slice(offset, offset + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map((device) => device.token),
      notification: { title: "SkillBridge", body },
      data: { url },
    });
    const expired = batch.filter((_device, index) => {
      const code = result.responses[index]?.error?.code;
      return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
    }).map((device) => device.id);
    if (expired.length) await prisma.notificationDevice.deleteMany({ where: { id: { in: expired }, userId: recipientId } });
  }
}

export async function getFirebaseWebConfig() {
  return firebaseApp && env.firebaseWeb && env.firebaseVapidKey && env.firebaseAdmin?.projectId === env.firebaseWeb.projectId
    ? { ...env.firebaseWeb, vapidKey: env.firebaseVapidKey }
    : null;
}

export async function registerNotificationDevice(userId: string, token: string, label: string) {
  return prisma.notificationDevice.upsert({
    where: { token },
    create: { userId, token, label },
    update: { userId, label, lastSeenAt: new Date() },
    select: { id: true, label: true, createdAt: true, lastSeenAt: true },
  });
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
