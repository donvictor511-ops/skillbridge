import { Router } from "express";
import { getDatabaseHealth, getHealth } from "./health.controller";

export const healthRouter = Router();

// Mounted at /api/v1/health
healthRouter.get("/", getHealth); // GET /api/v1/health
healthRouter.get("/db", getDatabaseHealth); // GET /api/v1/health/db
