import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Bell, Check, LoaderCircle, Trash2 } from "lucide-react";

import { paths } from "../../app/paths";
import { profilePath } from "../../app/paths";
import { Avatar } from "../../components/ui/Avatar";
import {
  useClearNotifications,
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "./notificationsQueries";
import type { Notification } from "./notifications.types";
import { FollowToggleButton } from "../follows/FollowToggleButton";

const NOTIFICATION_REFRESH_INTERVAL_MS = 5_000;

function formatNotificationDate(date: string): string {
  const notificationDate = new Date(date);

  if (Number.isNaN(notificationDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(notificationDate);
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  onDelete,
  busy,
}: {
  notification: Notification;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  busy: boolean;
}): ReactElement {
  const actorName = notification.actor.profile?.displayName ?? "Someone";
  const avatarUrl = notification.actor.profile?.avatarUrl ?? null;

  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b border-line px-3 py-3 ${notification.isRead ? "bg-surface" : "bg-brand/5"}`}
    >
      <Link
        to={profilePath(notification.actor.id)}
        aria-label={`View ${actorName}'s profile`}
        onClick={(event) => event.stopPropagation()}
        className="row-span-2 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Avatar name={actorName} src={avatarUrl} size="md" />
      </Link>

      <button
        type="button"
        onClick={onClick}
        className="col-start-2 row-start-1 flex min-w-0 gap-3 text-left transition-colors hover:bg-page"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink">
            {notification.type === "follow" ||
            notification.type === "post_like" ||
            notification.type === "post_comment" ||
            notification.type === "post_shared" ||
            notification.type === "community_post" ||
            notification.type === "community_invite" ||
            notification.type === "job_application" ||
            notification.type === "job_application_update" ||
            notification.type === "interview_scheduled" ||
            notification.type === "interview_updated" ||
            notification.type === "project_proposal" ||
            notification.type === "project_proposal_update"
              ? `${actorName} ${notification.message}`
              : notification.message}
          </span>

          <span className="mt-1 block text-xs text-muted">
            {formatNotificationDate(notification.createdAt)}
          </span>
        </span>

        {!notification.isRead && (
          <span
            className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand"
            aria-label="Unread"
          />
        )}
      </button>

      <div className="col-start-3 row-start-1 flex items-center gap-1">
        {!notification.isRead && (
          <button
            type="button"
            onClick={onMarkRead}
            disabled={busy}
            aria-label="Mark notification as read"
            title="Mark as read"
            className="rounded-control p-2 text-muted hover:bg-page hover:text-brand disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete notification"
          title="Delete notification"
          className="rounded-control p-2 text-muted hover:bg-danger/10 hover:text-danger-strong disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {notification.type === "follow" ? (
        <div className="col-start-2 row-start-2 justify-self-start">
          <FollowToggleButton
            userId={notification.actor.id}
            isFollowing={notification.actor.isFollowedByViewer}
            followLabel="Follow back"
          />
        </div>
      ) : null}
    </div>
  );
}

export function NotificationBell(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => ("Notification" in window ? window.Notification.permission : "denied"),
  );
  const seenNotificationIds = useRef<Set<string> | null>(null);

  const {
    data: notifications,
    isLoading,
    isError,
  } = useNotifications(true, NOTIFICATION_REFRESH_INTERVAL_MS);

  const { data: unreadCount = 0 } = useUnreadNotificationCount(
    true,
    NOTIFICATION_REFRESH_INTERVAL_MS,
  );

  useEffect(() => {
    if (!notifications) return;

    const currentIds = new Set(notifications.map((notification) => notification.id));
    if (seenNotificationIds.current === null) {
      seenNotificationIds.current = currentIds;
      return;
    }

    const newNotifications = notifications.filter(
      (notification) => !seenNotificationIds.current?.has(notification.id),
    );
    seenNotificationIds.current = currentIds;

    if (
      document.visibilityState !== "hidden" ||
      notificationPermission !== "granted" ||
      !("Notification" in window)
    ) {
      return;
    }

    for (const notification of newNotifications) {
      const actorName = notification.actor.profile?.displayName;
      const title = actorName ? `SkillBridge · ${actorName}` : "SkillBridge notification";
      const desktopNotification = new window.Notification(title, {
        body: notification.message,
        tag: notification.id,
        icon: "/favicon.ico",
      });
      desktopNotification.onclick = () => {
        window.focus();
        desktopNotification.close();
      };
    }
  }, [notifications, notificationPermission]);

  async function enableDesktopNotifications(): Promise<void> {
    if (!("Notification" in window)) return;
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
  }

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();
  const clearMutation = useClearNotifications();

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    setIsOpen(false);
    if (notification.type === "message" && notification.resourceId) {
      navigate(`${paths.messages}?conversationId=${encodeURIComponent(notification.resourceId)}`);
      return;
    }
    if (notification.type === "community_post" && notification.resourceId) {
      navigate(`${paths.communities}?communityId=${encodeURIComponent(notification.resourceId)}`);
      return;
    }
    if (notification.type === "community_invite") {
      navigate(paths.communities);
      return;
    }
    if (notification.type === "follow") {
      navigate(profilePath(notification.actor.id));
      return;
    }
    if (notification.type === "moderation_report") {
      navigate(`${paths.admin}?section=reports`);
      return;
    }
    if (notification.type === "account_appeal") {
      navigate(`${paths.admin}?section=appeals`);
      return;
    }
    if (notification.type === "content_moderation_case") {
      navigate(`${paths.admin}?section=auto_review`);
      return;
    }
    if (notification.type === "account_appeal_update") {
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate(paths.dashboard);
      return;
    }
    if (notification.type === "content_moderation_update") {
      navigate(paths.dashboard);
      return;
    }
    if (notification.type.startsWith("job_application") && notification.resourceId) {
      navigate(`${paths.jobs}/${encodeURIComponent(notification.resourceId)}`);
      return;
    }
    if (notification.type.startsWith("interview_")) {
      navigate(paths.jobApplications);
      return;
    }
    if (notification.type.startsWith("project_proposal") && notification.resourceId) {
      navigate(`${paths.projects}/${encodeURIComponent(notification.resourceId)}`);
      return;
    }
    if (
      notification.type === "post_like" ||
      notification.type === "post_comment" ||
      notification.type === "post_shared"
    ) {
      navigate({
        pathname: paths.posts,
        hash: notification.resourceId ? `#post-${notification.resourceId}` : "",
      });
    } else {
      navigate(paths.connections);
    }
  }

  function toggleNotifications(): void {
    if (!isOpen) void queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
    setIsOpen((previous) => !previous);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleNotifications}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-control text-navy transition-colors hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-line bg-surface shadow-card"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold text-navy">Notifications</h2>

            {unreadCount > 0 && (
              <span className="text-xs font-medium text-muted">
                {unreadCount} unread
              </span>
            )}
          </div>

          {notificationPermission !== "granted" && (
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm text-ink">
                {notificationPermission === "denied"
                  ? "Desktop notifications are blocked in your browser settings."
                  : "Get alerts when new notifications arrive while SkillBridge is in the background."}
              </p>
              {notificationPermission === "default" && (
                <button
                  type="button"
                  onClick={() => void enableDesktopNotifications()}
                  className="mt-2 text-sm font-semibold text-brand hover:text-brand-hover"
                >
                  Enable desktop notifications
                </button>
              )}
            </div>
          )}

          {notifications && notifications.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
              <button
                type="button"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
                className="text-xs font-semibold text-brand hover:text-brand-hover disabled:opacity-50"
              >
                {markAllAsReadMutation.isPending ? "Marking read…" : "Mark all as read"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete all your notifications? This cannot be undone.")) {
                    clearMutation.mutate();
                  }
                }}
                disabled={clearMutation.isPending}
                className="text-xs font-semibold text-danger-strong hover:underline disabled:opacity-50"
              >
                {clearMutation.isPending ? "Clearing…" : "Clear all"}
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading notifications...
              </div>
            ) : isError ? (
              <div className="px-4 py-8 text-center text-sm text-muted">
                Could not load notifications. Please try again later.
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <Bell className="mb-2 h-8 w-8 text-muted" />
                <p className="font-medium text-ink">You're all caught up</p>
                <p className="mt-1 text-sm text-muted">
                  New notifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkRead={() => markAsReadMutation.mutate(notification.id)}
                  onDelete={() => deleteMutation.mutate(notification.id)}
                  busy={markAsReadMutation.isPending || deleteMutation.isPending}
                />
              ))
            )}
          </div>

          {notifications && notifications.length > 0 && (
            <div className="border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={() => { setIsOpen(false); navigate(paths.notifications); }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
              >
                <Bell className="h-4 w-4" />
                View all notifications
              </button>
            </div>
          )}

          <div className="border-t border-line px-4 py-3">
            <button type="button" onClick={() => { setIsOpen(false); navigate(paths.notificationSettings); }} className="text-sm font-semibold text-brand hover:text-brand-hover">Notification settings</button>
          </div>

          {(markAllAsReadMutation.isError ||
            deleteMutation.isError ||
            clearMutation.isError ||
            markAsReadMutation.isError) && (
            <p
              role="alert"
              className="border-t border-line px-4 py-2 text-xs text-danger-strong"
            >
              Could not update notifications. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
