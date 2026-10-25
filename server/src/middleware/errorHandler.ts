import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// Express recognizes an error handler by its FOUR parameters.
// Keep all four, even if one is unused.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log the details on the server only. Never send them to the client.
  if (env.nodeEnv !== "test") {
    console.error(err);
  }

  // If a response was already started, let Express finish it.
  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  });
}
