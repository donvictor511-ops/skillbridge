import type { Capability } from "../onboarding/onboarding.options";

// The only user fields we ever send to the client.
// Note: no password and no passwordHash.
export interface AuthUser {
  id: string;
  email: string;
  createdAt: Date;
  capabilities: Capability[];
  // null until the person finishes onboarding
  onboardedAt: Date | null;
}

// The database fields that make up an AuthUser.
// Use this everywhere a user is loaded to be sent to the client.
export const authUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  capabilities: true,
  onboardedAt: true,
} as const;
