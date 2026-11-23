import type { Capability } from "./onboarding";

// The user as the API sends it. JSON turns dates into text.
export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  capabilities: Capability[];
  role: "member" | "admin";
  suspendedAt: string | null;
  suspensionReason: string | null;
  restrictedUntil: string | null;
  restrictionReason: string | null;
  // null until the person finishes onboarding
  onboardedAt: string | null;
}

// What the login and register forms send to the API.
export interface Credentials {
  email: string;
  password: string;
}
