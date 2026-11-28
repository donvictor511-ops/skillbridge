import { getApps, initializeApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { getFirebaseWebConfig, registerNotificationDevice } from "./notificationsService";

const firebaseAppName = "skillbridge-web-push";
const browserIdStorageKey = "skillbridge.pushDeviceId";
let fallbackBrowserId: string | null = null;

function supportedBrowser(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

function browserDeviceId(): string {
  try {
    const existing = localStorage.getItem(browserIdStorageKey);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(browserIdStorageKey, created);
    return created;
  } catch {
    fallbackBrowserId ??= crypto.randomUUID();
    return fallbackBrowserId;
  }
}

export function currentBrowserDeviceLabel(): string {
  const userAgent = navigator.userAgent;
  const browser = /SamsungBrowser/i.test(userAgent) ? "Samsung Internet"
    : /EdgA?|EdgiOS/i.test(userAgent) ? "Edge"
      : /OPR|Opera/i.test(userAgent) ? "Opera"
        : /CriOS|Chrome/i.test(userAgent) ? "Chrome"
          : /Firefox/i.test(userAgent) ? "Firefox"
            : /Safari/i.test(userAgent) ? "Safari"
              : "Web browser";
  const platform = /Android/i.test(userAgent) ? "Android"
    : /iPhone|iPad|iPod/i.test(userAgent) ? "iPhone/iPad"
      : /Windows/i.test(userAgent) ? "Windows"
        : /Macintosh|Mac OS/i.test(userAgent) ? "Mac"
          : /Linux/i.test(userAgent) ? "Linux"
            : "device";
  return `${browser} on ${platform} · ${browserDeviceId().slice(0, 8)}`;
}

export async function enableBrowserPush(): Promise<void> {
  if (!supportedBrowser() || !(await isSupported())) {
    throw new Error("This browser does not support background notifications.");
  }

  const config = await getFirebaseWebConfig();
  if (!config) throw new Error("Firebase web push is not configured on this SkillBridge server yet.");

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission === "denied") {
    throw new Error("Notifications are blocked for this site. Allow them in your browser's site settings, then try again.");
  }
  if (permission !== "granted") throw new Error("Allow notifications in your browser to enable push alerts.");

  const app = getApps().find((candidate) => candidate.name === firebaseAppName)
    ?? initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId, messagingSenderId: config.messagingSenderId }, firebaseAppName);
  const messaging = getMessaging(app);
  const workerParams = new URLSearchParams({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
    messagingSenderId: config.messagingSenderId,
  });
  const workerUrl = `/firebase-messaging-sw.js?${workerParams.toString()}`;
  const registration = await navigator.serviceWorker.register(workerUrl, { scope: "/" });
  const token = await getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase did not return a browser registration token.");
  await registerNotificationDevice({ token, label: currentBrowserDeviceLabel() });
}

export async function removeCurrentBrowserPush(): Promise<void> {
  if (!supportedBrowser() || !(await isSupported())) return;
  const config = await getFirebaseWebConfig();
  if (!config) return;
  const app = getApps().find((candidate) => candidate.name === firebaseAppName)
    ?? initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId, messagingSenderId: config.messagingSenderId }, firebaseAppName);
  await deleteToken(getMessaging(app));
}

export function browserPushSupported(): boolean {
  return supportedBrowser();
}
