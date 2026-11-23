import { useQuery } from "@tanstack/react-query";
import * as service from "./marketplaceService";

export const marketplaceKeys = {
  jobs: ["marketplace", "jobs"] as const,
  jobList: (search: string, category: string, mine: boolean, filters: { status: string; employmentType: string; remote: string }) => ["marketplace", "jobs", "list", search, category, mine, filters] as const,
  jobDetail: (id: string) => ["marketplace", "jobs", "detail", id] as const,
  applications: ["marketplace", "applications", "mine"] as const,
  projects: ["marketplace", "projects"] as const,
  projectList: (search: string, category: string, mine: boolean) => ["marketplace", "projects", "list", search, category, mine] as const,
  projectDetail: (id: string) => ["marketplace", "projects", "detail", id] as const,
  proposals: ["marketplace", "proposals", "mine"] as const,
};

export const useJobs = (search: string, category: string, mine: boolean, filters: { status: string; employmentType: string; remote: string }) => useQuery({ queryKey: marketplaceKeys.jobList(search, category, mine, filters), queryFn: () => service.getJobs(search, category, mine, filters), retry: false });
export const useJob = (id: string) => useQuery({ queryKey: marketplaceKeys.jobDetail(id), queryFn: () => service.getJob(id), enabled: Boolean(id), retry: false });
export const useMyApplications = (enabled = true) => useQuery({ queryKey: marketplaceKeys.applications, queryFn: service.getMyApplications, enabled, retry: false });
export const useProjects = (search: string, category: string, mine: boolean) => useQuery({ queryKey: marketplaceKeys.projectList(search, category, mine), queryFn: () => service.getProjects(search, category, mine), retry: false });
export const useProject = (id: string) => useQuery({ queryKey: marketplaceKeys.projectDetail(id), queryFn: () => service.getProject(id), enabled: Boolean(id), retry: false });
export const useMyProposals = (enabled = true) => useQuery({ queryKey: marketplaceKeys.proposals, queryFn: service.getMyProposals, enabled, retry: false });
