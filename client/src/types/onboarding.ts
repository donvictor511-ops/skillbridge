export type Capability = "professional" | "client";

// What the wizard collects and sends to POST /onboarding.
export interface OnboardingInput {
  capabilities: Capability[];
  displayName: string;
  headline: string;
  location: string;
  skills: string[];
  interests: string[];
  goals: string[];
  avatarUrl?: string;
  project?: {
    title: string;
    description: string;
    projectUrl?: string | null;
    skills: string[];
  };
}
