import { connectDatabase } from "../config/database.js";
import { connectRedis, createRedisSubscriberClient } from "../config/redis.js";
import { startNotificationWebhookOutboxConsumer } from "./notificationWebhookOutboxConsumer.js";
import { startNotificationWebhookServer } from "./notificationWebhookServer.js";
async function start(): Promise<void> {
  await connectDatabase();
  await connectRedis();
  const consumerClient = await createRedisSubscriberClient();
  if (!consumerClient) {
    console.error("[NotificationWebhook] REDIS_URL is required. Exiting.");
    process.exit(1);
  }
  startNotificationWebhookOutboxConsumer(consumerClient);
  startNotificationWebhookServer();
}
process.on("unhandledRejection", (reason) => {
  console.error("[NotificationWebhook] Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[NotificationWebhook] Uncaught exception:", err);
  process.exit(1);
});
try {
  await start();
} catch (err) {
  console.error("[NotificationWebhook] Failed to start:", err);
  process.exit(1);
}
