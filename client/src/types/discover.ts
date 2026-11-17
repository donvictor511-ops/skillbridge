import type { Capability } from "./onboarding";

export interface DiscoverSkill {
  id: string;
  name: string;
}

export interface DiscoverProfile {
  userId: string;
  displayName: string;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
  accountTypes: Capability[];
  skills: DiscoverSkill[];
}

export interface DiscoverPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DiscoverResponse {
  profiles: DiscoverProfile[];
  pagination: DiscoverPagination;
}

export interface DiscoverFilters {
  search?: string;
  skill?: string;
  location?: string;
  accountType?: Capability;
  page?: number;
  limit?: number;
}
