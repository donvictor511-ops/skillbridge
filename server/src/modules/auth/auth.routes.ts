import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { accountAppeal, login, logout, me, register } from "./auth.controller";

export const authRouter = Router();

// Mounted at /api/v1/auth
authRouter.post("/register", register); // POST /api/v1/auth/register
authRouter.post("/login", login); // POST /api/v1/auth/login
authRouter.post("/account-appeals", accountAppeal); // POST /api/v1/auth/account-appeals
authRouter.post("/logout", logout); // POST /api/v1/auth/logout
authRouter.get("/me", requireAuth, me); // GET  /api/v1/auth/me (protected)
