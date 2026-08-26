import { Router } from "express";

import { env } from "../config/env.js";
import { passport } from "../config/passport.js";
import { getCurrentUser, logout } from "../controllers/auth.controller.js";
import { AppError } from "../middleware/error.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.get("/google", (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    next(new AppError(503, "Google OAuth is not configured"));
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${env.FRONTEND_URL}/login?error=oauth` }),
  (_req, res) => res.redirect(`${env.FRONTEND_URL}/dashboard`),
);

authRouter.get("/me", requireAuth, getCurrentUser);
authRouter.post("/logout", requireAuth, logout);
