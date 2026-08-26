import type { RequestHandler } from "express";

import { AppError } from "./error.middleware.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  next();
};
