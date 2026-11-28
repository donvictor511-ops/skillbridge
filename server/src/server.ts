import { createApp } from "./app";
import { env } from "./config/env";
import { startNotificationEventListener, stopNotificationEventListener } from "./modules/messages/messages.realtime";
import { startPresenceMaintenance, stopPresenceMaintenance } from "./modules/messages/presence.runtime";

const app = createApp();
startNotificationEventListener();
startPresenceMaintenance();

const server = app.listen(env.port, () => {
  console.log(
    `SkillBridge API listening on http://localhost:${env.port} (${env.nodeEnv})`,
  );
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  stopNotificationEventListener();
  stopPresenceMaintenance();
  const forceClose = setTimeout(() => server.closeAllConnections(), 10_000);
  forceClose.unref();
  server.close(() => clearTimeout(forceClose));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
