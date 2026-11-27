/* Firebase's web push worker uses public web app config served by the API. */
importScripts("https://www.gstatic.com/firebasejs/13.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging-compat.js");

const apiBaseUrl = new URL(self.location.href).searchParams.get("apiBaseUrl");
if (apiBaseUrl) {
  fetch(`${apiBaseUrl}/notifications/firebase-config`, { credentials: "omit" })
    .then((response) => response.json())
    .then((result) => {
      if (!result?.data?.configured || !result.data.config) return;
      const { vapidKey, ...webConfig } = result.data.config;
      void vapidKey;
      firebase.initializeApp(webConfig);
      firebase.messaging();
    })
    .catch(() => {
      // The page reports setup problems during opt-in; the worker must stay quiet.
    });
}

self.addEventListener("notificationclick", (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  const targetUrl = event.notification.data?.FCM_MSG?.data?.url
    || event.notification.data?.url
    || "/posts";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const target = new URL(targetUrl, self.location.origin).toString();
    const existing = windows.find((client) => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
