import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const workerPath = fileURLToPath(new URL("../public/firebase-messaging-sw.js", import.meta.url));
const workerSource = readFileSync(workerPath, "utf8");

function startWorker(href) {
  const listeners = new Map();
  const state = { firebaseConfig: null, messagingInitialized: false, focused: 0, opened: [] };
  const clients = [{ url: "https://skillbridge.test/messages", focus: async () => { state.focused += 1; } }];
  const context = {
    URL,
    URLSearchParams,
    importScripts: () => undefined,
    firebase: {
      initializeApp(config) { state.firebaseConfig = config; },
      messaging() { state.messagingInitialized = true; return {}; },
    },
    self: {
      location: { href, origin: "https://skillbridge.test" },
      addEventListener(name, callback) { listeners.set(name, callback); },
      clients: {
        async matchAll() { return clients; },
        async openWindow(url) { state.opened.push(url); return null; },
      },
    },
  };
  vm.runInNewContext(workerSource, context, { filename: workerPath });
  return { listeners, state };
}

test("worker initializes Firebase from public configuration in its registration URL", () => {
  const params = new URLSearchParams({ apiKey: "public-key", authDomain: "example.firebaseapp.com", projectId: "project", appId: "app", messagingSenderId: "sender" });
  const { state } = startWorker(`https://skillbridge.test/firebase-messaging-sw.js?${params}`);
  assert.deepEqual({ ...state.firebaseConfig }, {
    apiKey: "public-key",
    authDomain: "example.firebaseapp.com",
    projectId: "project",
    appId: "app",
    messagingSenderId: "sender",
  });
  assert.equal(state.messagingInitialized, true);
});

test("notification click focuses the matching app tab and never opens a duplicate tab", async () => {
  const params = new URLSearchParams({ apiKey: "public-key", authDomain: "example.firebaseapp.com", projectId: "project", appId: "app", messagingSenderId: "sender" });
  const { listeners, state } = startWorker(`https://skillbridge.test/firebase-messaging-sw.js?${params}`);
  const event = {
    notification: { data: { FCM_MSG: { data: { url: "/messages" } } }, close() { this.closed = true; } },
    stopImmediatePropagation() { this.stopped = true; },
    waitUntil(promise) { this.pending = promise; },
  };
  listeners.get("notificationclick")(event);
  await event.pending;
  assert.equal(event.stopped, true);
  assert.equal(event.notification.closed, true);
  assert.equal(state.focused, 1);
  assert.deepEqual(state.opened, []);
});
