// The allowed choices. The server only accepts these exact codes.
// The client has a matching list with friendly labels
// (client/src/features/onboarding/onboardingOptions.ts). Keep them in sync.
export const CAPABILITIES = ["professional", "client"] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const GOALS = [
  "find-work",
  "find-clients",
  "hire-talent",
  "grow-network",
  "showcase-work",
  "collaborate",
  "learn",
] as const;

export const INTERESTS = [
  "software-development",
  "design",
  "data-and-ai",
  "product-management",
  "marketing",
  "writing",
  "finance",
  "education",
  "health",
  "engineering",
  "sales",
  "creative-media",
] as const;

export const MAX_SKILLS = 15;
export const MAX_INTERESTS = 8;
export const MAX_SKILL_LENGTH = 40;
