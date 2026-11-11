import type { ProfileVisibility } from "./profile";

// What we send when saving. They match the API.

// A "patch": only the fields that changed.
export interface ProfilePatch {
  displayName?: string;
  headline?: string | null;
  location?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  visibility?: ProfileVisibility;
  interests?: string[];
  goals?: string[];
}

export interface ExperienceInput {
  title: string;
  company: string;
  location: string | null;
  startDate: string; // "YYYY-MM"
  endDate: string | null; // "YYYY-MM", or null for a current job
  description: string | null;
}

export interface EducationInput {
  school: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
}
