import type { Capability } from "./onboarding";

export type ProfileVisibility = "public" | "members" | "private";

export interface ProfileSkill {
  id: string;
  name: string;
  // How many portfolio projects use this skill (the "proof").
  projectCount: number;
}

export interface ProfileExperience {
  id: string;
  title: string;
  company: string;
  location: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null means "current"
  description: string | null;
}

export interface ProfileEducation {
  id: string;
  school: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
}

export interface ProfileProjectSkill {
  id: string;
  name: string;
}

export interface ProfileProject {
  id: string;
  title: string;
  description: string;
  projectUrl: string | null;
  imageUrl: string | null;
  skills: ProfileProjectSkill[];
}

export interface ProfileBusiness {
  companyName: string;
  websiteUrl: string | null;
  industry: string | null;
  sizeRange: string | null;
  about: string | null;
}

// What OTHER people may see.
export interface PublicProfile {
  userId: string;
  joinedAt: string;
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  displayName: string;
  headline: string | null;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  accountTypes: Capability[];
  interests: string[];
  spokenLanguages: string[];
  skills: ProfileSkill[];
  experiences: ProfileExperience[];
  education: ProfileEducation[];
  projects: ProfileProject[];
  business: ProfileBusiness | null;
}

// What the OWNER gets: everything public, plus the private parts.
export interface OwnerProfile extends PublicProfile {
  visibility: ProfileVisibility;
  goals: string[];
  allowCommunityInvites: boolean;
  createdAt: string;
  updatedAt: string;
}
