import { Briefcase, Building2 } from "lucide-react";
import type { ChoiceOption } from "../../components/forms/ChoiceGroup";
import type { Capability } from "../../types/onboarding";

// The values must match the server (onboarding.options.ts).
// Labels and descriptions are only for display.

export const MAX_SKILLS = 15;
export const MAX_INTERESTS = 8;
export const MAX_SKILL_LENGTH = 40;

export const capabilityOptions: ChoiceOption<Capability>[] = [
  {
    value: "professional",
    label: "Professional",
    description:
      "I want to show my skills, build a profile, and find opportunities.",
    icon: Briefcase,
  },
  {
    value: "client",
    label: "Client or business",
    description:
      "I want to present my company and find skilled people to work with.",
    icon: Building2,
  },
];

export const goalOptions: ChoiceOption<string>[] = [
  { value: "find-work", label: "Find a job or freelance work" },
  { value: "find-clients", label: "Find clients or projects" },
  { value: "hire-talent", label: "Hire talent" },
  { value: "grow-network", label: "Grow my network" },
  { value: "showcase-work", label: "Showcase my work" },
  { value: "collaborate", label: "Collaborate on projects" },
  { value: "learn", label: "Learn and grow" },
];

export const interestOptions: ChoiceOption<string>[] = [
  { value: "software-development", label: "Software development" },
  { value: "design", label: "Design" },
  { value: "data-and-ai", label: "Data and AI" },
  { value: "product-management", label: "Product management" },
  { value: "marketing", label: "Marketing" },
  { value: "writing", label: "Writing" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "engineering", label: "Engineering" },
  { value: "sales", label: "Sales" },
  { value: "creative-media", label: "Creative and media" },
];

// Quick-add ideas. People can still type any skill they like.
export const suggestedSkills: readonly string[] = [
  "JavaScript",
  "TypeScript",
  "React",
  "Python",
  "UI design",
  "Figma",
  "Copywriting",
  "Project management",
  "SEO",
  "Data analysis",
];
