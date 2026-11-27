export type NotificationType =
  | "follow"
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
  isFollowedByViewer: boolean;
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

export interface NotificationInboxResponse {
  data: Notification[];
  nextCursor: string | null;
}

export interface MarkNotificationReadResponse {
  id: string;
  isRead: boolean;
}

export interface NotificationBatchActionResponse {
  updatedCount?: number;
  deletedCount?: number;
}

export interface NotificationPreferences {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  postLikes: boolean;
  comments: boolean;
  mentions: boolean;
  messages: boolean;
  connections: boolean;
  groups: boolean;
  marketplace: boolean;
  platformUpdates: boolean;
}

export interface NotificationDevice {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface NotificationSettings {
  preferences: NotificationPreferences;
  devices: NotificationDevice[];
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  vapidKey: string;
}
