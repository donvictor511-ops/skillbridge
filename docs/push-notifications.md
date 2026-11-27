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

The Web app values and VAPID public key are returned by the API's public `/api/v1/notifications/firebase-config` endpoint. It never returns Admin credentials. Do not place Admin credentials in `client/.env`, the web bundle, or the service worker.

Use the same target project ID for `FIREBASE_PROJECT_ID` and `FIREBASE_WEB_PROJECT_ID`. Leave these variables blank until you have real credentials; invalid or incomplete setup keeps push disabled without blocking API startup.

After adding variables, restart the API and run `npm run db:deploy` to create notification preferences, push device registrations, bookmarks, and the PostgreSQL notification event trigger. Deploy SkillBridge behind HTTPS; browsers restrict service workers and background push to secure contexts (localhost is allowed for development).

## Delivery behavior

Push starts disabled. A member must enable it from a user action, grant browser permission, and register a device. Multiple browser registrations are supported, and members can remove registrations from Notification settings. Invalid or expired FCM tokens are removed after delivery errors. Push delivery runs separately from the request that created the in-app notification, so temporary Firebase failures do not fail that request.

Browser and operating-system support, user permission, and Firebase project configuration are required. If Firebase configuration is absent, the settings page explains that push setup is unavailable; no push is sent.
