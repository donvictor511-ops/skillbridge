import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { AppError } from "../../utils/appError";
import { authUserSelect } from "./auth.types";
import type { AuthUser } from "./auth.types";
import { createSession } from "./session.service";
import type { CreatedSession } from "./session.service";
import { setSessionCookie } from "./auth.cookies";
import { AuthProvider } from "../../generated/prisma/enums";

export type OAuthProviderName = "google" | "linkedin" | "github";

const STATE_COOKIE_PREFIX = "sb_oauth_";
const STATE_COOKIE_PATH = "/api/v1/auth/oauth";
const STATE_TTL_MS = 10 * 60 * 1000;

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

interface ProviderProfile {
  subject: string;
  email: string;
  emailVerified: boolean;
}

export function isOAuthProvider(value: string): value is OAuthProviderName {
  return value === "google" || value === "linkedin" || value === "github";
}

export function getOAuthAvailability(): Record<OAuthProviderName, boolean> {
  return {
    google: Boolean(env.googleClientId && env.googleClientSecret),
    linkedin: Boolean(env.linkedinClientId && env.linkedinClientSecret),
    github: Boolean(env.githubClientId && env.githubClientSecret),
  };
}

export function beginOAuth(
  req: Request,
  res: Response,
  provider: OAuthProviderName,
): void {
  const config = getProviderConfig(provider);
  const state = randomBytes(32).toString("base64url");
  const stateCookie = getStateCookieName(provider);
  res.cookie(stateCookie, state, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_TTL_MS,
  });

  const redirectUrl = new URL(config.authorizeUrl);
  redirectUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getRedirectUri(req, provider),
    response_type: "code",
    scope: config.scope,
    state,
  }).toString();
  res.redirect(302, redirectUrl.toString());
}

export async function completeOAuth(
  req: Request,
  res: Response,
  provider: OAuthProviderName,
): Promise<void> {
  const cookieName = getStateCookieName(provider);
  const savedState: unknown = req.cookies?.[cookieName];
  const returnedState = typeof req.query.state === "string" ? req.query.state : "";
  clearStateCookie(res, cookieName);
  if (!isValidState(savedState, returnedState)) {
    throw new AppError(400, "OAUTH_STATE_INVALID", "Sign-in could not be verified. Please try again.");
  }
  if (typeof req.query.error === "string") {
    throw new AppError(400, "OAUTH_CANCELLED", "Sign-in was cancelled. Please try again.");
  }
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) throw new AppError(400, "OAUTH_CODE_MISSING", "Sign-in could not be completed. Please try again.");

  const profile = await exchangeCodeAndGetProfile(provider, code, getRedirectUri(req, provider));
  if (!profile.emailVerified) {
    throw new AppError(403, "OAUTH_EMAIL_UNVERIFIED", "Verify your email with the provider before using it to sign in.");
  }

  const user = await findOrCreateOAuthUser(provider, profile);
  if (user.suspendedAt) {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Contact SkillBridge support.");
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
}

export function oauthFailureUrl(provider: OAuthProviderName): string {
  const url = new URL("/login", env.clientOrigin);
  url.searchParams.set("oauthError", provider);
  return url.toString();
}

export function oauthSuccessUrl(): string {
  return new URL("/", env.clientOrigin).toString();
}

function getProviderConfig(provider: OAuthProviderName): ProviderConfig {
  if (provider === "google" && env.googleClientId && env.googleClientSecret) {
    return {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid profile email",
    };
  }
  if (provider === "linkedin" && env.linkedinClientId && env.linkedinClientSecret) {
    return {
      clientId: env.linkedinClientId,
      clientSecret: env.linkedinClientSecret,
      authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      userInfoUrl: "https://api.linkedin.com/v2/userinfo",
      scope: "openid profile email",
    };
  }
  if (provider === "github" && env.githubClientId && env.githubClientSecret) {
    return {
      clientId: env.githubClientId,
      clientSecret: env.githubClientSecret,
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userInfoUrl: "https://api.github.com/user",
      scope: "read:user user:email",
    };
  }
  throw new AppError(503, "OAUTH_NOT_CONFIGURED", `${provider} sign-in is not configured yet.`);
}

function getRedirectUri(req: Request, provider: OAuthProviderName): string {
  // The Vercel /api rewrite keeps the callback on the website origin so the
  // browser can store the same session cookie used by normal API requests.
  const origin = env.clientOrigin || `${req.protocol}://${req.get("host")}`;
  return new URL(`/api/v1/auth/oauth/${provider}/callback`, origin).toString();
}

function getStateCookieName(provider: OAuthProviderName): string {
  return `${STATE_COOKIE_PREFIX}${provider}`;
}

function clearStateCookie(res: Response, name: string): void {
  res.clearCookie(name, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
  });
}

function isValidState(saved: unknown, returned: string): boolean {
  if (typeof saved !== "string" || !saved || !returned) return false;
  const savedBytes = Buffer.from(saved);
  const returnedBytes = Buffer.from(returned);
  return savedBytes.length === returnedBytes.length && timingSafeEqual(savedBytes, returnedBytes);
}

async function exchangeCodeAndGetProfile(
  provider: OAuthProviderName,
  code: string,
  redirectUri: string,
): Promise<ProviderProfile> {
  const config = getProviderConfig(provider);
  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  if (!tokenResponse.ok) throw new Error("OAuth token exchange failed.");
  const tokenPayload: unknown = await tokenResponse.json();
  const accessToken = readString(tokenPayload, "access_token");
  if (!accessToken) throw new Error("OAuth provider did not return an access token.");

  const profileResponse = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: provider === "github" ? "application/vnd.github+json" : "application/json",
      ...(provider === "github" ? { "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "SkillBridge" } : {}),
    },
  });
  if (!profileResponse.ok) throw new Error("OAuth profile lookup failed.");
  const payload: unknown = await profileResponse.json();
  const subject = provider === "github" ? readIdentifier(payload, "id") : readString(payload, "sub");
  let email = readString(payload, "email").trim().toLowerCase();
  let emailVerified = readBoolean(payload, "email_verified");
  if (provider === "github") {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "SkillBridge",
      },
    });
    if (!emailsResponse.ok) throw new Error("GitHub email lookup failed.");
    const emailsPayload: unknown = await emailsResponse.json();
    const verifiedEmails = Array.isArray(emailsPayload)
      ? emailsPayload.filter((item) => typeof item === "object" && item !== null && (item as Record<string, unknown>).verified === true)
      : [];
    const primaryEmail = verifiedEmails.find((item) => (item as Record<string, unknown>).primary === true) ?? verifiedEmails[0];
    const emailValue = primaryEmail && (primaryEmail as Record<string, unknown>).email;
    email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
    emailVerified = Boolean(email);
  }
  if (!subject || !email || !email.includes("@")) throw new Error("OAuth profile is missing a usable email.");
  return { subject, email, emailVerified };
}

function readString(payload: unknown, key: string): string {
  if (typeof payload !== "object" || payload === null || !(key in payload)) return "";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readBoolean(payload: unknown, key: string): boolean {
  if (typeof payload !== "object" || payload === null || !(key in payload)) return false;
  return (payload as Record<string, unknown>)[key] === true;
}

function readIdentifier(payload: unknown, key: string): string {
  if (typeof payload !== "object" || payload === null || !(key in payload)) return "";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

async function findOrCreateOAuthUser(
  provider: OAuthProviderName,
  profile: ProviderProfile,
): Promise<AuthUser> {
  const providerType = provider === "google"
    ? AuthProvider.google
    : provider === "linkedin"
      ? AuthProvider.linkedin
      : AuthProvider.github;
  const identityWhere = {
    provider_providerSubject: { provider: providerType, providerSubject: profile.subject },
  };
  const existingIdentity = await prisma.authIdentity.findUnique({
    where: identityWhere,
    select: { user: { select: authUserSelect } },
  });
  if (existingIdentity) return existingIdentity.user;

  try {
    return await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: profile.email }, select: { id: true } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: profile.email,
            // OAuth-only accounts get a deliberately unusable password hash.
            passwordHash: `oauth-only$${randomBytes(64).toString("hex")}`,
          },
          select: { id: true },
        });
      }
      await tx.authIdentity.create({
        data: { userId: user.id, provider: providerType, providerSubject: profile.subject },
      });
      return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: authUserSelect });
    });
  } catch {
    // A simultaneous callback may have created the provider link first.
    const linked = await prisma.authIdentity.findUnique({
      where: identityWhere,
      select: { user: { select: authUserSelect } },
    });
    if (linked) return linked.user;
    throw new AppError(409, "OAUTH_ACCOUNT_CONFLICT", "This sign-in could not be linked to your SkillBridge account. Try logging in with your existing method.");
  }
}
