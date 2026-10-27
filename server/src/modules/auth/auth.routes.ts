import { Router } from "express";
import { register } from "./auth.controller";

export const authRouter = Router();

// Mounted at /api/v1/auth
authRouter.post("/register", register); // POST /api/v1/auth/register
