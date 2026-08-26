import { createClient } from "redis";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export const sessionRedis = createClient({ url: env.REDIS_URL });

sessionRedis.on("error", (error) => {
  logger.error("Session Redis error", { error: error.message });
});

export async function connectSessionRedis(): Promise<void> {
  if (!sessionRedis.isOpen) await sessionRedis.connect();
  logger.info("Session Redis connected");
}

export async function disconnectSessionRedis(): Promise<void> {
  if (sessionRedis.isOpen) await sessionRedis.quit();
  logger.info("Session Redis disconnected");
}
