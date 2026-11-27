import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, CheckCheck, Settings, Trash2 } from "lucide-react";
import { paths } from "../../app/paths";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Spinner } from "../../components/ui/Spinner";
import { useDeleteNotification, useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotificationInbox, useUnreadNotificationCount } from "./notificationsQueries";
import type { Notification } from "./notifications.types";

function relativeTime(isoDate: string): string {
  const seconds = Math.round((new Date(isoDate).getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [["year", 31_536_000], ["month", 2_592_000], ["week", 604_800], ["day", 86_400], ["hour", 3_600], ["minute", 60]];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  return formatter.format(seconds, "second");
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const inbox = useNotificationInbox(filter);
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();
  const items = useMemo(() => inbox.data?.pages.flatMap((page) => page.data) ?? [], [inbox.data]);

  useEffect(() => { document.title = "Notifications | SkillBridge"; }, []);

  function openNotification(notification: Notification) {
    if (!notification.isRead) markRead.mutate(notification.id);
    if (notification.type === "message" && notification.resourceId) navigate(`${paths.messages}?conversationId=${encodeURIComponent(notification.resourceId)}`);
    else if (notification.type === "community_post" && notification.resourceId) navigate(`${paths.communities}?communityId=${encodeURIComponent(notification.resourceId)}`);
    else if (notification.type === "community_invite") navigate(paths.communities);
    else if (notification.type === "moderation_report") navigate(`${paths.admin}?section=reports`);
    else if (notification.type === "account_appeal") navigate(`${paths.admin}?section=appeals`);
    else if (notification.type === "content_moderation_case") navigate(`${paths.admin}?section=auto_review`);
    else if (notification.type === "connection_request" || notification.type === "connection_accepted") navigate(paths.connections);
    else if (["post_like", "post_comment", "post_shared"].includes(notification.type) && notification.resourceId) navigate(`${paths.posts}#post-${encodeURIComponent(notification.resourceId)}`);
    else navigate(paths.posts);
  }

  return <main className="min-h-screen bg-page px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wider text-brand">Your activity</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">Notifications</h1><p className="mt-2 text-sm text-muted">Updates about your posts, network, conversations, and communities.</p></div><Link to={paths.notificationSettings} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-page"><Settings className="h-4 w-4" />Settings</Link></header>
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2" role="tablist" aria-label="Filter notifications">{(["all", "unread"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === value ? "bg-navy text-white" : "text-muted hover:bg-page"}`}>{value}{value === "unread" && unread.data ? ` (${unread.data})` : ""}</button>)}</div><Button variant="secondary" size="sm" disabled={!unread.data || markAllRead.isPending} onClick={() => markAllRead.mutate()}><CheckCheck className="mr-2 h-4 w-4" />{markAllRead.isPending ? "Marking…" : "Mark all read"}</Button></div></Card>
    {inbox.isPending ? <Card className="flex justify-center py-12"><Spinner label="Loading notifications" /></Card> : null}
    {inbox.isError ? <ErrorMessage title="Could not load notifications" message="Please try again." onRetry={() => void inbox.refetch()} /> : null}
    {inbox.isSuccess && !items.length ? <Card><EmptyState icon={Bell} title={filter === "unread" ? "No unread notifications" : "You’re all caught up"} description={filter === "unread" ? "New updates will appear here." : "Activity on your posts and network will appear here."} /></Card> : null}
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{items.map((item) => <article key={item.id} className={`flex items-center gap-3 p-4 ${item.isRead ? "" : "bg-brand/5"}`}><button type="button" onClick={() => openNotification(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Avatar name={item.actor.profile?.displayName ?? "Someone"} src={item.actor.profile?.avatarUrl} size="md" /><span className="min-w-0 flex-1"><span className="block text-sm text-ink">{item.message}</span><time className="mt-1 block text-xs text-muted" dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time></span>{!item.isRead ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Unread" /> : null}</button>{!item.isRead ? <button type="button" onClick={() => markRead.mutate(item.id)} disabled={markRead.isPending} aria-label="Mark as read" title="Mark as read" className="rounded-lg p-2 text-muted hover:bg-page disabled:opacity-50"><CheckCheck className="h-4 w-4" /></button> : null}<button type="button" onClick={() => deleteNotification.mutate(item.id)} disabled={deleteNotification.isPending} aria-label="Delete notification" title="Delete" className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger-strong disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></article>)}</div>
    {inbox.hasNextPage ? <div className="flex justify-center"><Button variant="secondary" onClick={() => void inbox.fetchNextPage()} loading={inbox.isFetchingNextPage}>Load more notifications</Button></div> : null}
  </div></main>;
}
