import { Router } from "express";
import { getHealth } from "./health.controller";

export const healthRouter = Router();

// Mounted at /api/v1/health, so "/" here means GET /api/v1/health
healthRouter.get("/", getHealth);
