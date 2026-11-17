import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express } from "express";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { onboardingRouter } from "./modules/onboarding/onboarding.routes";
import { profileRouter } from "./modules/profiles/profile.routes";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { rejectNullCharacters } from "./middleware/rejectNullCharacters";
import { discoverRouter } from "./modules/discover/discover.routes";

export function createApp(): Express {
  const app = express();

  // Do not advertise which framework we use.
  app.disable("x-powered-by");

  // Only our own website may call this API from a browser, and it may send
  // cookies. Never use "*" together with cookies.
  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, origin === env.clientOrigin);
      },
      credentials: true,
    }),
  );

  // Read JSON request bodies. The small limit blocks oversized requests.
  app.use(express.json({ limit: "10kb" }));

  // Refuse the invisible "code 0" character in any text we were sent.
  app.use(rejectNullCharacters);

  // Read cookies into req.cookies.
  app.use(cookieParser());

  // Routes
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/onboarding", onboardingRouter);
  app.use("/api/v1/profiles", profileRouter);
  app.use("/api/v1/discover", discoverRouter);

  // These two MUST stay last, in this order.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
