import { apiClient } from "../../services/apiClient";
import type { ApiSuccessResponse } from "../../types/api";

export type AiTask = "profile_improvement" | "cv_assistance" | "job_recommendations" | "project_recommendations" | "writing_assistance" | "skill_recommendations" | "professional_matching";
export interface AiAssistInput { task: AiTask; draft?: string; target?: string; writingType?: "post" | "proposal"; }
export interface AiAssistResult { text?: string; summary?: string; recommendations?: Array<{ id: string; label: string; reason: string }>; }
export interface AiStatus { configured: boolean; }

export async function getAiStatus(): Promise<AiStatus> {
  const { data } = await apiClient.get<ApiSuccessResponse<AiStatus>>("/ai/status");
  return data.data;
}

export async function requestAiAssistance(input: AiAssistInput): Promise<AiAssistResult> {
  // Gemini can take longer than the shared 10-second API timeout. Keep this
  // request alive long enough for the server's 60-second provider deadline.
  const { data } = await apiClient.post<ApiSuccessResponse<AiAssistResult>>("/ai/assist", input, { timeout: 70_000 });
  return data.data;
}
