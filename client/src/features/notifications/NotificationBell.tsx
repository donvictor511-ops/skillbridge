import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";

import { paths } from "../../app/paths";
import { Avatar } from "../../components/ui/Avatar";
import {
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "./notificationsQueries";
import type { Notification } from "./notifications.types";

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
}: {
  notification: Notification;
  onClick: () => void;
}): ReactElement {
  const actorName = notification.actor.profile?.displayName ?? "Someone";
  const avatarUrl = notification.actor.profile?.avatarUrl ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-page ${
        notification.isRead ? "bg-surface" : "bg-brand/5"
      }`}
    >
      <Avatar name={actorName} src={avatarUrl} size="md" />

      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{notification.message}</span>

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
  );
}

export function NotificationBell(): ReactElement {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: notifications,
    isLoading,
    isError,
  } = useNotifications(true, 60_000);

  const { data: unreadCount = 0 } = useUnreadNotificationCount(true, 30_000);

  const markAsReadMutation = useMarkNotificationAsRead();

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
    navigate(paths.connections);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
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
                />
              ))
            )}
          </div>

          {notifications && notifications.length > 0 && (
            <div className="border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={() => navigate(paths.connections)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
              >
                <CheckCheck className="h-4 w-4" />
                View connections
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
