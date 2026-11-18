export type NotificationType = "connection_request" | "connection_accepted";

export interface NotificationActor {
  id: string;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  resourceId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor;
}

export interface MarkNotificationReadResponse {
  id: string;
  isRead: boolean;
}
