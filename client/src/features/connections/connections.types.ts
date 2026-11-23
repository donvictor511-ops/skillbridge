export type ConnectionStatus = "pending" | "accepted" | "rejected";

export type ConnectionDirection = "incoming" | "outgoing";

export interface ConnectionUser {
  userId: string;
  displayName: string;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
  mutualConnectionCount?: number;
}

export interface Connection {
  id: string;
  status: ConnectionStatus;
  direction: ConnectionDirection;
  createdAt: string;
  updatedAt: string;
  user: ConnectionUser;
}

export interface CreateConnectionResponse {
  id: string;
  status: ConnectionStatus;
  requestedById: string;
  createdAt: string;
}

export interface UpdateConnectionResponse {
  id: string;
  status: ConnectionStatus;
  requestedById: string;
  updatedAt: string;
}
