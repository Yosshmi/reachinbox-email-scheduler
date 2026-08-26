import cors from "cors";
import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";

import { env } from "./config/env.js";
import { passport } from "./config/passport.js";
import { prisma } from "./db/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { redis } from "./redis/redis.js";
import { emailRouter } from "./routes/email.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { sessionRedis } from "./redis/session.redis.js";

export const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    name: "reachinbox.sid",
    store: new RedisStore({ client: sessionRedis, prefix: "session:" }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1_000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

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

app.use("/api/emails", emailRouter);
app.use("/auth", authRouter);

app.use(notFoundHandler);
app.use(errorHandler);
