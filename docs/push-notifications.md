# Firebase browser push setup

SkillBridge uses Firebase Cloud Messaging (FCM) for optional browser push. In-app notifications and authenticated server-sent events continue to work when Firebase is not configured. Push permission is requested only after a member enables browser notifications in **Notification settings**.

## Firebase project setup

1. Create or select a Firebase project and register a Web app.
2. In Firebase Console, open **Project settings → General** and copy the Web app values for API key, Auth domain, project ID, app ID, and Messaging sender ID.
3. Open **Project settings → Cloud Messaging → Web Push certificates** and generate a VAPID key pair. The public key is used by the browser SDK.
4. Enable the Firebase Cloud Messaging API for the project.
5. Create a Firebase Admin service account with permission to send FCM messages. Keep its private key on the API server only.

## Environment variables

Set these in the API server environment (see `server/.env.example`):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (preserve line breaks as `\\n` in dotenv files)
- `FIREBASE_WEB_API_KEY`
- `FIREBASE_WEB_AUTH_DOMAIN`
- `FIREBASE_WEB_PROJECT_ID`
- `FIREBASE_WEB_APP_ID`
- `FIREBASE_WEB_MESSAGING_SENDER_ID`
- `FIREBASE_VAPID_KEY` (public Web Push key)
- `FIREBASE_DEVICE_TOKEN_ENCRYPTION_KEY` (server-only base64 for a random 32-byte AES-256 key)

The Web app values and VAPID public key are returned by the API's public `/api/v1/notifications/firebase-config` endpoint. It never returns Admin credentials. Do not place Admin credentials in `client/.env`, the web bundle, or the service worker.

Use the same target project ID for `FIREBASE_PROJECT_ID` and `FIREBASE_WEB_PROJECT_ID`. Generate the encryption key once with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, store it only in the API server environment, and keep it stable. The API stores only a SHA-256 lookup hash and AES-256-GCM encrypted FCM token; it never returns tokens to the browser. Changing this key requires users to register their browsers again.

Leave Firebase variables blank until you have real credentials; incomplete setup keeps push disabled without blocking API startup. The public Firebase web configuration and VAPID key are passed to the service worker at registration. Firebase Admin credentials and the token encryption key never enter the client bundle or service worker URL.

After adding variables, run `npm run db:deploy` in `server/` before restarting the API. This creates presence sessions, the push delivery outbox, notification preferences, and the PostgreSQL event trigger. The migration clears any older plaintext FCM tokens, so each browser must be registered again. Deploy SkillBridge behind HTTPS; browsers restrict service workers and background push to secure contexts (localhost is allowed for development).

## Delivery behavior

Push starts disabled. A member must enable it from a user action in **Notification settings**, grant browser permission, and register that browser. Each browser/device is registered separately. Device ownership comes from the authenticated account, tokens are encrypted at rest, and one token cannot silently be reassigned to another account. Members can remove registrations from Notification settings. Invalid or expired FCM tokens are removed after delivery errors.

Each notification is queued once in PostgreSQL. Workers claim rows atomically, retry temporary FCM errors with backoff, and use the notification ID as the Web Push tag so a retry replaces the same alert instead of stacking duplicates. Service worker setup uses Firebase's background messaging handler for notification payloads, and its click handler focuses an existing SkillBridge tab or opens the target page.

## Presence behavior

Each open browser tab gets a separate server-generated presence session. The page refreshes it every 25 seconds, including while Chrome is minimized or another tab is selected. A page-close signal or SSE disconnect removes that session; a database cleanup job expires sessions that stop heartbeating after 2 minutes. A user remains online while any tab or device has a fresh session. Presence is stored in PostgreSQL and transitions are broadcast through PostgreSQL notifications, so multiple API instances share the same status.

Browser and operating-system support, user permission, and Firebase project configuration are required. If Firebase configuration is absent, the settings page explains that push setup is unavailable; no push is sent.

Unit checks: `npm run test:unit` in `server/` and `npm run test:push-worker` in `client/`. Real background and closed-browser delivery still needs an HTTPS deployment, Firebase project credentials, database migrations, browser permission, and a device registration. Verify it by sending a real notification with Chrome minimized and then fully closed; mocks do not prove Firebase delivery.
