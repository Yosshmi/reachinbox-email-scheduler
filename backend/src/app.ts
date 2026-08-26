import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { redis } from "./redis/redis.js";

export const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res, next) => {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        services: { database: "up", redis: "up" },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);
