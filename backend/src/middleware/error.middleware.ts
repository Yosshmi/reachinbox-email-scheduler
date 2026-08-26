import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.path} was not found`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        details: error.flatten().fieldErrors,
      },
    });
    return;
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : "Internal server error";

  logger.error("Request failed", {
    method: req.method,
    path: req.path,
    statusCode,
    error: error instanceof Error ? error.message : String(error),
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(env.NODE_ENV === "development" && error instanceof Error
        ? { stack: error.stack }
        : {}),
    },
  });
};
