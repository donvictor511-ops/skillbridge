import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { accountAppeal, finishOAuth, login, logout, me, oauthProviders, register, requestPasswordResetHandler, resetPasswordHandler, startOAuth } from "./auth.controller";

export const authRouter = Router();

// Mounted at /api/v1/auth
authRouter.post("/register", register); // POST /api/v1/auth/register
authRouter.post("/password-reset/request", requestPasswordResetHandler);
authRouter.post("/password-reset/complete", resetPasswordHandler);
authRouter.get("/oauth/providers", oauthProviders);
authRouter.get("/oauth/:provider", startOAuth);
authRouter.get("/oauth/:provider/callback", finishOAuth);
authRouter.post("/login", login); // POST /api/v1/auth/login
authRouter.post("/account-appeals", accountAppeal); // POST /api/v1/auth/account-appeals
authRouter.post("/logout", logout); // POST /api/v1/auth/logout
authRouter.get("/me", requireAuth, me); // GET  /api/v1/auth/me (protected)
