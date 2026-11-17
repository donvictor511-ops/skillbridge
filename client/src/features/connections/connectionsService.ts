import type { ApiSuccessResponse } from "../../types/api";
import { apiClient } from "../../services/apiClient";

import type {
  Connection,
  ConnectionStatus,
  CreateConnectionResponse,
  UpdateConnectionResponse,
} from "./connections.types";

export async function getConnections(
  status?: ConnectionStatus,
): Promise<Connection[]> {
  const response = await apiClient.get<ApiSuccessResponse<Connection[]>>(
    "/connections",
    {
      params: status ? { status } : undefined,
    },
  );

  return response.data.data;
}

export async function sendConnectionRequest(
  userId: string,
): Promise<CreateConnectionResponse> {
  const response = await apiClient.post<
    ApiSuccessResponse<CreateConnectionResponse>
  >(`/connections/${userId}`);

  return response.data.data;
}

export async function acceptConnectionRequest(
  connectionId: string,
): Promise<UpdateConnectionResponse> {
  const response = await apiClient.patch<
    ApiSuccessResponse<UpdateConnectionResponse>
  >(`/connections/${connectionId}/accept`);

  return response.data.data;
}

export async function rejectConnectionRequest(
  connectionId: string,
): Promise<UpdateConnectionResponse> {
  const response = await apiClient.patch<
    ApiSuccessResponse<UpdateConnectionResponse>
  >(`/connections/${connectionId}/reject`);

  return response.data.data;
}

export async function removeConnection(connectionId: string): Promise<void> {
  await apiClient.delete(`/connections/${connectionId}`);
}
