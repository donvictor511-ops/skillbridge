export interface MarketplacePerson {
  id: string;
  profile: { displayName: string; avatarUrl: string | null; headline: string | null; location?: string | null } | null;
}
export type ApplicationStatus = "submitted" | "reviewing" | "accepted" | "rejected" | "withdrawn";
export type ProposalStatus = "submitted" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
export type ListingStatus = "open" | "closed" | "in_progress" | "completed" | "cancelled";
export interface InterviewSummary { id: string; scheduledAt: string; durationMinutes: number; mode: "audio" | "video"; status: "scheduled" | "cancelled" | "completed"; notes: string | null; }

export interface JobSummary {
  id: string; title: string; description: string; category: string; employmentType: string;
  location: string | null; isRemote: boolean; budgetMin: number | null; budgetMax: number | null;
  currency: string; status: ListingStatus; createdAt: string; ownerId: string; owner: MarketplacePerson;
  applicationCount: number; myApplicationStatus: ApplicationStatus | null;
}
export interface JobApplication {
  id: string; coverLetter: string; status: ApplicationStatus; createdAt: string; updatedAt: string; cvFileName?: string | null;
  applicant: MarketplacePerson;
  interview?: InterviewSummary | null;
}
export interface JobDetail extends JobSummary {
  updatedAt: string;
  applications: JobApplication[];
  myApplication: JobApplication | null;
}
export interface JobApplicationSummary {
  id: string; coverLetter: string; status: ApplicationStatus; createdAt: string; updatedAt: string; cvFileName?: string | null;
  job: { id: string; title: string; category: string; status: ListingStatus; owner: MarketplacePerson };
  interview?: InterviewSummary | null;
}

export interface ProjectSummary {
  id: string; title: string; description: string; category: string; skills: string[];
  budget: number | null; currency: string; deliveryTime: string | null; status: ListingStatus;
  createdAt: string; ownerId: string; owner: MarketplacePerson; proposalCount: number;
  myProposalStatus: ProposalStatus | null;
}
export interface ProjectProposal {
  id: string; coverLetter: string; proposedBudget: number | null; deliveryTime: string | null;
  status: ProposalStatus; createdAt: string; updatedAt: string; author: MarketplacePerson;
}
export interface ProjectDetail extends ProjectSummary {
  updatedAt: string;
  proposals: ProjectProposal[];
  myProposal: ProjectProposal | null;
}
export interface ProjectProposalSummary {
  id: string; coverLetter: string; proposedBudget: number | null; deliveryTime: string | null;
  status: ProposalStatus; createdAt: string; updatedAt: string;
  project: { id: string; title: string; category: string; status: ListingStatus; owner: MarketplacePerson };
}
