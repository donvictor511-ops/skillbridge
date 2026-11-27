import { getApps, initializeApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { apiBaseURL } from "../../services/apiClient";
import { getFirebaseWebConfig, registerNotificationDevice } from "./notificationsService";

const firebaseAppName = "skillbridge-web-push";

function supportedBrowser(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export async function enableBrowserPush(): Promise<void> {
  if (!supportedBrowser() || !(await isSupported())) {
    throw new Error("This browser does not support background notifications.");
  }

  const config = await getFirebaseWebConfig();
  if (!config) throw new Error("Firebase web push is not configured on this SkillBridge server yet.");

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Allow notifications in your browser to enable push alerts.");

  const app = getApps().find((candidate) => candidate.name === firebaseAppName)
    ?? initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId, messagingSenderId: config.messagingSenderId }, firebaseAppName);
  const messaging = getMessaging(app);
  const workerUrl = `/firebase-messaging-sw.js?apiBaseUrl=${encodeURIComponent(apiBaseURL)}`;
  const registration = await navigator.serviceWorker.register(workerUrl, { scope: "/" });
  const token = await getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase did not return a browser registration token.");
  await registerNotificationDevice({ token, label: "This browser" });
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
