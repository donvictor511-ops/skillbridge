export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "post_like"
  | "post_comment"
  | "post_shared"
  | "message"
  | "community_post"
  | "community_invite"
  | "job_application"
  | "job_application_update"
  | "interview_scheduled"
  | "interview_updated"
  | "project_proposal"
  | "project_proposal_update"
  | "moderation_report"
  | "account_appeal"
  | "account_appeal_update"
  | "content_moderation_case"
  | "content_moderation_update";

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

export interface NotificationBatchActionResponse {
  updatedCount?: number;
  deletedCount?: number;
}
