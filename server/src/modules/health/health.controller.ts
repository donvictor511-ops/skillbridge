import type { Request, Response } from "express";
import { env } from "../../config/env";
import { checkDatabase } from "./health.service";

interface HealthData {
  status: "ok";
  service: string;
  environment: string;
  timestamp: string;
}

interface DatabaseHealthData {
  status: "ok";
  database: "connected";
  timestamp: string;
}

export function getHealth(_req: Request, res: Response): void {
  const data: HealthData = {
    status: "ok",
    service: "skillbridge-api",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json({ data });
}

export async function getDatabaseHealth(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    await checkDatabase();

    const data: DatabaseHealthData = {
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({ data });
  } catch (error: unknown) {
    // Real details stay in the server log only.
    if (env.nodeEnv !== "test") {
      console.error("Database health check failed:", error);
    }

    res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The database is not reachable right now.",
      },
    });
  }
}
