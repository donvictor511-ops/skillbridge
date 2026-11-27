import { createApp } from "./app";
import { env } from "./config/env";
import { startNotificationEventListener } from "./modules/messages/messages.realtime";

const app = createApp();
startNotificationEventListener();

app.listen(env.port, () => {
  console.log(
    `SkillBridge API listening on http://localhost:${env.port} (${env.nodeEnv})`,
  );
});
