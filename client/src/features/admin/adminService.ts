import { apiClient } from "../../services/apiClient";
import type { ApiSuccessResponse } from "../../types/api";

export interface AdminOverview {
  totalUsers: number; activeUsers: number; suspendedUsers: number; restrictedUsers: number;
  totalPosts: number; totalComments: number; totalCommunities: number; totalJobs: number;
  totalProjects: number; totalApplications: number; totalMessages: number; pendingReports: number; pendingAppeals: number; pendingModerationCases: number;
  newUsersLast30Days: number; postsLast30Days: number;
}
export interface AdminUser {
  id: string; email: string; role: "member" | "admin"; createdAt: string;
  suspendedAt: string | null; suspensionReason: string | null; restrictedUntil: string | null; restrictionReason: string | null;
  profile: { displayName: string; headline: string | null; avatarUrl: string | null } | null;
  _count: { posts: number; postComments: number; reportsMade: number };
}
export interface AdminReport {
  id: string; type: "user" | "post" | "community"; targetId: string | null; targetKind: string;
  content: string | null; status: string; reason: string; details: string | null; createdAt: string;
  reporter: { id: string; email: string; profile: { displayName: string; avatarUrl: string | null } | null };
  targetUser?: AdminUser;
  targetAuthor?: { id: string; email: string; profile: { displayName: string; avatarUrl: string | null } | null } | null;
  community?: { id: string; name: string; guidelines: string };
}
export interface AdminHistory {
  id: string; targetType: string; targetId: string | null; action: string; reason: string; createdAt: string;
  actor: { id: string; email: string; profile: { displayName: string; avatarUrl: string | null } | null } | null;
  targetUser: AdminUser | null;
}
export interface AdminAppeal {
  id: string; status: "pending" | "accepted" | "rejected"; message: string; createdAt: string; resolvedAt: string | null; resolutionNote: string | null;
  user: { id: string; email: string; suspendedAt: string | null; suspensionReason: string | null; restrictedUntil: string | null; restrictionReason: string | null; profile: { displayName: string; avatarUrl: string | null } | null };
  adminAction: { action: string; reason: string; createdAt: string } | null;
  resolvedBy: { id: string; email: string; profile: { displayName: string | null } | null } | null;
}
export interface AdminModerationCase {
  id: string; contentType: "post" | "comment" | "community_post" | "community_comment"; contentId: string;
  contentSnapshot: string; category: string; explanation: string; confidence: number; communityName: string | null; createdAt: string;
  author: AdminUser | null;
}
export interface PageResult<T> { items: T[]; page: number; pageSize: number; total: number }
function unwrap<T>(response: { data: ApiSuccessResponse<T> }): T { return response.data.data; }

export async function getAdminOverview(): Promise<AdminOverview> { return unwrap(await apiClient.get<ApiSuccessResponse<AdminOverview>>("/admin/overview")); }
export async function getAdminUsers(page: number, search: string): Promise<PageResult<AdminUser>> { return unwrap(await apiClient.get<ApiSuccessResponse<PageResult<AdminUser>>>("/admin/users", { params: { page, ...(search.trim() ? { search: search.trim() } : {}) } })); }
export async function getAdminReports(page: number, status: string): Promise<PageResult<AdminReport>> { return unwrap(await apiClient.get<ApiSuccessResponse<PageResult<AdminReport>>>("/admin/reports", { params: { page, status } })); }
export async function getAdminHistory(page: number): Promise<PageResult<AdminHistory>> { return unwrap(await apiClient.get<ApiSuccessResponse<PageResult<AdminHistory>>>("/admin/history", { params: { page } })); }
export async function getAdminAppeals(page: number): Promise<PageResult<AdminAppeal>> { return unwrap(await apiClient.get<ApiSuccessResponse<PageResult<AdminAppeal>>>("/admin/appeals", { params: { page } })); }
export async function getAdminModerationCases(page: number): Promise<PageResult<AdminModerationCase>> { return unwrap(await apiClient.get<ApiSuccessResponse<PageResult<AdminModerationCase>>>("/admin/moderation-cases", { params: { page } })); }
export async function updateAdminUser(input: { userId: string; action: "suspend" | "restrict" | "restore"; reason: string; durationDays: number }): Promise<void> { const { userId, ...body } = input; await apiClient.patch(`/admin/users/${encodeURIComponent(userId)}/status`, body); }
export async function resolveAdminReport(input: { type: AdminReport["type"]; reportId: string; action: "review" | "dismiss" | "remove"; reason: string }): Promise<void> { const { type, reportId, ...body } = input; await apiClient.patch(`/admin/reports/${type}/${encodeURIComponent(reportId)}`, body); }
export async function resolveAdminAppeal(input: { appealId: string; action: "accept" | "reject"; note: string }): Promise<void> { const { appealId, ...body } = input; await apiClient.patch(`/admin/appeals/${encodeURIComponent(appealId)}`, body); }
export async function resolveAdminModerationCase(input: { caseId: string; action: "approve" | "remove"; note: string }): Promise<void> { const { caseId, ...body } = input; await apiClient.patch(`/admin/moderation-cases/${encodeURIComponent(caseId)}`, body); }
