import { apiClient } from "../../services/apiClient";
import type { ApiSuccessResponse } from "../../types/api";
import type { JobApplicationSummary, JobDetail, JobSummary, ProjectDetail, ProjectProposalSummary, ProjectSummary } from "./marketplace.types";

const options = (search: string, category: string, mine = false) => ({ params: { ...(search ? { search } : {}), ...(category ? { category } : {}), ...(mine ? { mine: "true", status: "all" } : {}) } });
export async function getJobs(search: string, category: string, mine = false, filters: { status?: string; employmentType?: string; remote?: string } = {}) {
  const { data } = await apiClient.get<ApiSuccessResponse<JobSummary[]>>("/marketplace/jobs", { params: { ...options(search, category, mine).params, ...(!mine && filters.status ? { status: filters.status } : {}), ...(filters.employmentType ? { employmentType: filters.employmentType } : {}), ...(filters.remote ? { remote: filters.remote } : {}) } }); return data.data;
}
export async function getJob(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<JobDetail>>(`/marketplace/jobs/${encodeURIComponent(id)}`); return data.data;
}
export async function createJob(input: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiSuccessResponse<JobDetail>>("/marketplace/jobs", input); return data.data;
}
export async function updateJob(input: { id: string; data: Record<string, unknown> }) {
  const { data } = await apiClient.patch<ApiSuccessResponse<JobDetail>>(`/marketplace/jobs/${encodeURIComponent(input.id)}`, input.data); return data.data;
}
export async function createJobApplication(input: { id: string; coverLetter: string; cv: File }) {
  const form = new FormData(); form.set("coverLetter", input.coverLetter); form.set("cv", input.cv);
  const { data } = await apiClient.post(`/marketplace/jobs/${encodeURIComponent(input.id)}/applications`, form, { headers: { "Content-Type": "multipart/form-data" } }); return data.data;
}
export async function updateJobApplication(input: { listingId: string; applicationId: string; status: string; interview?: { scheduledAt: string; durationMinutes: number; mode: "audio" | "video"; notes?: string } }) {
  const { data } = await apiClient.patch(`/marketplace/jobs/${encodeURIComponent(input.listingId)}/applications/${encodeURIComponent(input.applicationId)}`, { status: input.status, ...(input.interview ? { interview: input.interview } : {}) }); return data.data;
}
export async function getMyApplications() {
  const { data } = await apiClient.get<ApiSuccessResponse<JobApplicationSummary[]>>("/marketplace/jobs/applications/mine"); return data.data;
}

export async function getProjects(search: string, category: string, mine = false) {
  const { data } = await apiClient.get<ApiSuccessResponse<ProjectSummary[]>>("/marketplace/projects", options(search, category, mine)); return data.data;
}
export async function getProject(id: string) {
  const { data } = await apiClient.get<ApiSuccessResponse<ProjectDetail>>(`/marketplace/projects/${encodeURIComponent(id)}`); return data.data;
}
export async function createProject(input: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiSuccessResponse<ProjectDetail>>("/marketplace/projects", input); return data.data;
}
export async function updateProject(input: { id: string; data: Record<string, unknown> }) {
  const { data } = await apiClient.patch<ApiSuccessResponse<ProjectDetail>>(`/marketplace/projects/${encodeURIComponent(input.id)}`, input.data); return data.data;
}
export async function createProjectProposal(input: { id: string; coverLetter: string; proposedBudget?: number; deliveryTime?: string }) {
  const { id, ...body } = input;
  const { data } = await apiClient.post(`/marketplace/projects/${encodeURIComponent(id)}/proposals`, body); return data.data;
}
export async function updateProjectProposal(input: { listingId: string; proposalId: string; status: string }) {
  const { data } = await apiClient.patch(`/marketplace/projects/${encodeURIComponent(input.listingId)}/proposals/${encodeURIComponent(input.proposalId)}`, { status: input.status }); return data.data;
}
export async function getMyProposals() {
  const { data } = await apiClient.get<ApiSuccessResponse<ProjectProposalSummary[]>>("/marketplace/projects/proposals/mine"); return data.data;
}
