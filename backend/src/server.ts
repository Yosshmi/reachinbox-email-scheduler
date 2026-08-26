import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./db/prisma.js";
import { closeEmailQueue } from "./queues/email.queue.js";
import { disconnectRedis } from "./redis/redis.js";
import { connectSessionRedis, disconnectSessionRedis } from "./redis/session.redis.js";
import { reconcileScheduledJobs } from "./services/reconciliation.service.js";
import { logger } from "./utils/logger.js";

let server: ReturnType<typeof app.listen>;

async function start(): Promise<void> {
  await connectDatabase();
  await connectSessionRedis();
  await reconcileScheduledJobs();
  server = app.listen(env.PORT, () => {
    logger.info("Server started", {
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info("Shutdown signal received", { signal });
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve();
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeEmailQueue();
  await Promise.all([disconnectDatabase(), disconnectRedis(), disconnectSessionRedis()]);
  logger.info("Server stopped");
}

process.on("SIGINT", () => void shutdown("SIGINT").then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown("SIGTERM").then(() => process.exit(0)));

start().catch((error: unknown) => {
  logger.error("Server startup failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
