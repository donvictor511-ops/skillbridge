import express from "express";
import type { Express } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): Express {
  const app = express();

  // Do not advertise which framework we use.
  app.disable("x-powered-by");

  // Read JSON request bodies. The small limit blocks oversized requests.
  app.use(express.json({ limit: "10kb" }));

  // Routes
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);

  // These two MUST stay last, in this order.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
