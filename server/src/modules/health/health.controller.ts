import type { Request, Response } from "express";
import { env } from "../../config/env";

interface HealthData {
  status: "ok";
  service: string;
  environment: string;
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
