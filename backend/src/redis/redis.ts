import { Redis } from "ioredis";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (error) => logger.error("Redis error", { error: error.message }));

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info("Redis disconnected");
}
