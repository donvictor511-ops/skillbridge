import { useState } from "react";
import type { ReactElement } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, Flag, Shield, Users, UserX, MessageSquareText, BriefcaseBusiness, RefreshCw, ScanSearch } from "lucide-react";
import { Navigate, useSearchParams } from "react-router";
import { paths } from "../../app/paths";
import { useCurrentUser } from "../auth/authQueries";
import { Badge, Card, EmptyState, Spinner } from "../../components/ui";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { getApiErrorInfo } from "../../lib/apiError";
import type { AdminAppeal, AdminModerationCase, AdminReport, AdminUser } from "./adminService";
import { getAdminAppeals, getAdminHistory, getAdminModerationCases, getAdminOverview, getAdminReports, getAdminUsers, resolveAdminAppeal, resolveAdminModerationCase, resolveAdminReport, updateAdminUser } from "./adminService";
import { LoadMoreButton } from "../../components/ui/LoadMoreButton";

type Section = "overview" | "reports" | "users" | "history" | "appeals" | "auto_review";
const sections: Section[] = ["overview", "reports", "users", "history", "appeals", "auto_review"];
const queryKeys = { overview: ["admin", "overview"] as const, users: (search: string) => ["admin", "users", search] as const, reports: (page: number, status: string) => ["admin", "reports", page, status] as const, history: (page: number) => ["admin", "history", page] as const, appeals: (page: number) => ["admin", "appeals", page] as const, autoReview: (page: number) => ["admin", "moderation-cases", page] as const };
const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function StatCard({ title, value, detail, icon: Icon }: { title: string; value: number; detail: string; icon: typeof Users }): ReactElement {
  return <Card className="p-4"><div className="flex items-start justify-between"><div><p className="text-sm text-muted">{title}</p><p className="mt-2 text-2xl font-bold text-navy">{value.toLocaleString()}</p><p className="mt-1 text-xs text-muted">{detail}</p></div><span className="rounded-xl bg-brand/10 p-2.5 text-brand"><Icon className="h-5 w-5" /></span></div></Card>;
}

export function AdminDashboardPage(): ReactElement {
  useDocumentTitle("Administration | SkillBridge");
  const { data: currentUser, isPending: userPending } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section: Section = sections.includes(requestedSection as Section) ? requestedSection as Section : "overview";
  const [search, setSearch] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [appealPage, setAppealPage] = useState(1);
  const [moderationPage, setModerationPage] = useState(1);
  const [reportStatus, setReportStatus] = useState("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: queryKeys.overview, queryFn: getAdminOverview, retry: false });
  const users = useInfiniteQuery({ queryKey: queryKeys.users(search), queryFn: ({ pageParam }) => getAdminUsers(pageParam, search), initialPageParam: 1, getNextPageParam: (lastPage) => lastPage.page < Math.ceil(lastPage.total / lastPage.pageSize) ? lastPage.page + 1 : undefined, enabled: section === "users", retry: false });
  const reports = useQuery({ queryKey: queryKeys.reports(reportPage, reportStatus), queryFn: () => getAdminReports(reportPage, reportStatus), enabled: section === "reports", retry: false });
  const history = useQuery({ queryKey: queryKeys.history(historyPage), queryFn: () => getAdminHistory(historyPage), enabled: section === "history", retry: false });
  const appeals = useQuery({ queryKey: queryKeys.appeals(appealPage), queryFn: () => getAdminAppeals(appealPage), enabled: section === "appeals", retry: false });
  const moderationCases = useQuery({ queryKey: queryKeys.autoReview(moderationPage), queryFn: () => getAdminModerationCases(moderationPage), enabled: section === "auto_review", retry: false });
  const userMutation = useMutation({ mutationFn: updateAdminUser, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin"] }), queryClient.invalidateQueries({ queryKey: ["auth", "me"] })]); } });
  const reportMutation = useMutation({ mutationFn: resolveAdminReport, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin"] }); } });
  const appealMutation = useMutation({ mutationFn: resolveAdminAppeal, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin"] }), queryClient.invalidateQueries({ queryKey: ["notifications"] })]); } });
  const moderationMutation = useMutation({ mutationFn: resolveAdminModerationCase, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin"] }), queryClient.invalidateQueries({ queryKey: ["notifications"] })]); } });

  if (userPending) return <div className="flex justify-center py-20"><Spinner label="Loading administrator access" /></div>;
  if (currentUser?.role !== "admin") return <Navigate to={paths.accessDenied} replace />;

  const currentError = overview.isError ? getApiErrorInfo(overview.error).message : users.isError ? getApiErrorInfo(users.error).message : reports.isError ? getApiErrorInfo(reports.error).message : history.isError ? getApiErrorInfo(history.error).message : appeals.isError ? getApiErrorInfo(appeals.error).message : moderationCases.isError ? getApiErrorInfo(moderationCases.error).message : null;
  function changeUser(user: AdminUser, action: "suspend" | "restrict" | "restore") {
    const reason = action === "restore" ? "Account restriction lifted by administrator." : window.prompt(`Reason to ${action} ${user.profile?.displayName ?? user.email}:`, "Repeated community guideline violations");
    if (!reason || (action !== "restore" && reason.trim().length < 5)) return;
    if (action === "suspend" && !window.confirm(`Suspend ${user.profile?.displayName ?? user.email}? Their sessions will be ended.`)) return;
    userMutation.mutate({ userId: user.id, action, reason: reason.trim(), durationDays: 7 });
  }
  function changeReport(report: AdminReport, action: "review" | "dismiss" | "remove") {
    if (action === "remove" && !window.confirm("Remove this reported content from SkillBridge? The report and content snapshot will remain in moderation history.")) return;
    const defaultReason = action === "remove"
      ? `Content removed for violating guidelines: ${report.reason.replaceAll("_", " ")}.`
      : action === "dismiss" ? "Reviewed; no guideline violation found." : "Reviewed by an administrator.";
    const reason = window.prompt("Add a moderation note for the audit history:", defaultReason);
    if (!reason?.trim()) return;
    reportMutation.mutate({ type: report.type, reportId: report.id, action, reason: reason.trim() });
  }
  async function refreshAdminData() {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["admin"], refetchType: "active" });
    } finally {
      setIsRefreshing(false);
    }
  }
  function changeAppeal(appeal: AdminAppeal, action: "accept" | "reject") {
    if (action === "accept" && !window.confirm(`Accept ${appeal.user.profile?.displayName ?? appeal.user.email}'s appeal and restore their account?`)) return;
    const defaultNote = action === "accept" ? "Appeal accepted after review; account restriction lifted." : "Appeal reviewed and denied.";
    const note = window.prompt("Add a decision note for the member and moderation history:", defaultNote);
    if (!note?.trim()) return;
    appealMutation.mutate({ appealId: appeal.id, action, note: note.trim() });
  }
  function changeModerationCase(item: AdminModerationCase, action: "approve" | "remove") {
    if (action === "remove" && !window.confirm("Remove this held content? The author will be notified and the decision will be recorded.")) return;
    const note = window.prompt("Add a brief review note:", action === "approve" ? "Reviewed in context; no guideline violation found." : "Repeated identical posting is spam under the community guidelines.");
    if (!note?.trim()) return;
    moderationMutation.mutate({ caseId: item.id, action, note: note.trim() });
  }
  function selectSection(value: Section) {
    setSearchParams(value === "overview" ? {} : { section: value });
  }
  function nav(label: string, value: Section, icon: typeof Shield) { const Icon = icon; return <button type="button" onClick={() => selectSection(value)} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${section === value ? "bg-navy text-white" : "text-muted hover:bg-page hover:text-navy"}`}><Icon className="h-4 w-4" />{label}</button>; }

  return <main className="min-h-screen bg-page px-4 py-8 sm:px-6 sm:py-10"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><Badge tone="danger"><Shield className="mr-1 h-3.5 w-3.5" />Administrator workspace</Badge><h1 className="mt-3 text-3xl font-bold tracking-tight text-navy">Platform administration</h1><p className="mt-2 text-sm text-muted">Review reports, protect members, and monitor platform activity.</p></div><button type="button" disabled={isRefreshing} aria-busy={isRefreshing} onClick={() => void refreshAdminData()} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-page disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />{isRefreshing ? "Refreshing…" : "Refresh data"}</button></header>
    <nav aria-label="Administration" className="flex flex-wrap gap-2">{nav("Overview", "overview", BarChart3)}{nav(`Reports${overview.data?.pendingReports ? ` (${overview.data.pendingReports})` : ""}`, "reports", Flag)}{nav(`Held content${overview.data?.pendingModerationCases ? ` (${overview.data.pendingModerationCases})` : ""}`, "auto_review", ScanSearch)}{nav("Users", "users", Users)}{nav("Moderation history", "history", Activity)}{nav(`Appeals${overview.data?.pendingAppeals ? ` (${overview.data.pendingAppeals})` : ""}`, "appeals", Shield)}</nav>
    {currentError ? <Card role="alert" className="border-danger/30 text-sm text-danger-strong">{currentError}</Card> : null}
    {userMutation.isError || reportMutation.isError || appealMutation.isError || moderationMutation.isError ? <Card role="alert" className="border-danger/30 text-sm text-danger-strong">{getApiErrorInfo(userMutation.error ?? reportMutation.error ?? appealMutation.error ?? moderationMutation.error).message}</Card> : null}
    {section === "overview" ? <>
      {overview.isPending ? <Card className="flex justify-center py-12"><Spinner label="Loading platform analytics" /></Card> : overview.data ? <>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard title="Members" value={overview.data.totalUsers} detail={`+${overview.data.newUsersLast30Days} in the last 30 days`} icon={Users} /><StatCard title="Pending reports" value={overview.data.pendingReports} detail={`${overview.data.suspendedUsers} suspended · ${overview.data.restrictedUsers} restricted`} icon={Flag} /><StatCard title="Posts and comments" value={overview.data.totalPosts + overview.data.totalComments} detail={`${overview.data.postsLast30Days} posts in the last 30 days`} icon={MessageSquareText} /><StatCard title="Communities" value={overview.data.totalCommunities} detail={`${overview.data.totalJobs} jobs · ${overview.data.totalProjects} projects`} icon={BriefcaseBusiness} /></section>
        <Card><h2 className="text-lg font-semibold text-navy">Platform activity</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-2xl font-bold text-navy">{overview.data.totalApplications.toLocaleString()}</p><p className="text-sm text-muted">Job applications</p></div><div><p className="text-2xl font-bold text-navy">{overview.data.totalMessages.toLocaleString()}</p><p className="text-sm text-muted">Messages sent</p></div><div><p className="text-2xl font-bold text-navy">{overview.data.activeUsers.toLocaleString()}</p><p className="text-sm text-muted">Accounts in good standing</p></div></div></Card>
      </> : null}
    </> : null}
    {section === "users" ? <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-navy">User management</h2><p className="mt-1 text-sm text-muted">Search members and apply temporary restrictions.</p></div><input aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="h-10 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-sm" /></div>
      {users.isPending ? <div className="flex justify-center py-10"><Spinner label="Loading users" /></div> : users.data?.pages.some((page) => page.items.length) ? <div className="mt-5 divide-y divide-line">{users.data.pages.flatMap((page) => page.items).map((user) => <UserRow key={user.id} user={user} pending={userMutation.isPending} onAction={changeUser} />)}</div> : <EmptyState title="No members found" description="Try another name or email." />}
      {users.data && users.hasNextPage ? <LoadMoreButton label="members" loaded={users.data.pages.reduce((count, page) => count + page.items.length, 0)} total={users.data.pages[0]?.total ?? 0} loading={users.isFetchingNextPage} onClick={() => void users.fetchNextPage()} /> : null}
      {users.isFetchNextPageError ? <p role="alert" className="mt-3 text-center text-sm text-danger-strong">Could not load more members. Try again.</p> : null}</Card> : null}
    {section === "reports" ? <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-navy">Reports inbox</h2><p className="mt-1 text-sm text-muted">Review profile, post, comment, and community reports.</p></div><select aria-label="Filter report status" value={reportStatus} onChange={(event) => { setReportStatus(event.target.value); setReportPage(1); }} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm"><option value="pending">Pending</option><option value="all">All reports</option><option value="reviewed">Reviewed</option><option value="actioned">Actioned</option><option value="dismissed">Dismissed</option></select></div>
      {reports.isPending ? <div className="flex justify-center py-10"><Spinner label="Loading reports" /></div> : reports.data?.items.length ? <div className="mt-5 space-y-3">{reports.data.items.map((report) => <ReportRow key={`${report.type}-${report.id}`} report={report} pending={reportMutation.isPending} onAction={changeReport} />)}</div> : <EmptyState title="No reports to review" description="Reports from profiles, posts, comments, and communities will appear here." icon={Flag} />}
      {reports.data ? <Pager page={reports.data.page} total={reports.data.total} pageSize={reports.data.pageSize} onPage={setReportPage} /> : null}</Card> : null}
    {section === "history" ? <Card><h2 className="text-lg font-semibold text-navy">Moderation history</h2><p className="mt-1 text-sm text-muted">Every administrative decision is recorded for accountability.</p>
      {history.isPending ? <div className="flex justify-center py-10"><Spinner label="Loading moderation history" /></div> : history.data?.items.length ? <div className="mt-5 divide-y divide-line">{history.data.items.map((item) => <div key={item.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-ink">{item.action.replaceAll("_", " ")} · {item.targetType.replaceAll("_", " ")}</p><time className="text-xs text-muted">{dateTime(item.createdAt)}</time></div><p className="mt-1 text-sm text-muted">{item.reason}</p><p className="mt-1 text-xs text-muted">By {item.actor?.profile?.displayName ?? item.actor?.email ?? "Former administrator"}{item.targetUser ? ` · ${item.targetUser.profile?.displayName ?? item.targetUser.email}` : ""}</p></div>)}</div> : <EmptyState title="No moderation actions yet" description="Completed report reviews and account actions will appear here." icon={Activity} />}
      {history.data ? <Pager page={history.data.page} total={history.data.total} pageSize={history.data.pageSize} onPage={setHistoryPage} /> : null}</Card> : null}
    {section === "appeals" ? <Card><h2 className="text-lg font-semibold text-navy">Account appeals</h2><p className="mt-1 text-sm text-muted">Review appeals from members with an active suspension or restriction. Accepting restores account access.</p>
      {appeals.isPending ? <div className="flex justify-center py-10"><Spinner label="Loading account appeals" /></div> : appeals.data?.items.length ? <div className="mt-5 divide-y divide-line">{appeals.data.items.map((appeal) => <AppealRow key={appeal.id} appeal={appeal} pending={appealMutation.isPending} onAction={changeAppeal} />)}</div> : <EmptyState title="No account appeals" description="Member appeals will appear here for review." icon={Shield} />}
      {appeals.data ? <Pager page={appeals.data.page} total={appeals.data.total} pageSize={appeals.data.pageSize} onPage={setAppealPage} /> : null}</Card> : null}
    {section === "auto_review" ? <Card><h2 className="text-lg font-semibold text-navy">Held content</h2><p className="mt-1 text-sm text-muted">Repeated identical posts are hidden until a person reviews them. A repeat signal is not by itself proof of harmful intent.</p>
      {moderationCases.isPending ? <div className="flex justify-center py-10"><Spinner label="Loading held content" /></div> : moderationCases.data?.items.length ? <div className="mt-5 divide-y divide-line">{moderationCases.data.items.map((item) => <ModerationCaseRow key={item.id} item={item} pending={moderationMutation.isPending} onAction={changeModerationCase} />)}</div> : <EmptyState title="Nothing waiting for review" description="New held items will appear here and create an administrator notification." icon={ScanSearch} />}
      {moderationCases.data ? <Pager page={moderationCases.data.page} total={moderationCases.data.total} pageSize={moderationCases.data.pageSize} onPage={setModerationPage} /> : null}</Card> : null}
  </div></main>;
}

function ModerationCaseRow({ item, pending, onAction }: { item: AdminModerationCase; pending: boolean; onAction: (item: AdminModerationCase, action: "approve" | "remove") => void }): ReactElement {
  return <article className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge tone="warning">Pending review</Badge><span className="text-xs font-semibold uppercase tracking-wide text-muted">{item.contentType.replaceAll("_", " ")} · {item.category.replaceAll("_", " ")}</span></div><p className="mt-2 text-xs text-muted">{item.author?.profile?.displayName ?? item.author?.email ?? "Former member"}{item.communityName ? ` · ${item.communityName}` : ""} · {dateTime(item.createdAt)}</p></div><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => onAction(item, "remove")} className="rounded-lg border border-danger/30 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50">Remove</button><button type="button" disabled={pending} onClick={() => onAction(item, "approve")} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50">Approve</button></div></div><blockquote className="mt-3 whitespace-pre-wrap rounded-lg bg-page p-3 text-sm text-ink">{item.contentSnapshot}</blockquote><p className="mt-2 text-sm text-muted">{item.explanation} ({Math.round(item.confidence * 100)}% signal)</p></article>;
}

function UserRow({ user, pending, onAction }: { user: AdminUser; pending: boolean; onAction: (user: AdminUser, action: "suspend" | "restrict" | "restore") => void }): ReactElement {
  const suspended = Boolean(user.suspendedAt);
  const restricted = Boolean(user.restrictedUntil && new Date(user.restrictedUntil) > new Date());
  return <div className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate font-semibold text-ink">{user.profile?.displayName ?? "Member"} <span className="font-normal text-muted">· {user.email}</span></p><p className="mt-1 text-xs text-muted">Joined {dateTime(user.createdAt)} · {user._count.posts} posts · {user._count.postComments} comments · {user._count.reportsMade} reports submitted</p><div className="mt-2 flex flex-wrap gap-2">{user.role === "admin" ? <Badge tone="brand">Admin</Badge> : null}{suspended ? <Badge tone="danger">Suspended</Badge> : restricted ? <Badge tone="warning">Restricted until {dateTime(user.restrictedUntil!)}</Badge> : <Badge tone="success">Active</Badge>}</div></div>{user.role !== "admin" ? <div className="flex gap-2">{suspended || restricted ? <button type="button" disabled={pending} onClick={() => onAction(user, "restore")} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-page disabled:opacity-50">Restore account</button> : <><button type="button" disabled={pending} onClick={() => onAction(user, "restrict")} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-page disabled:opacity-50">Restrict 7 days</button><button type="button" disabled={pending} onClick={() => onAction(user, "suspend")} className="rounded-lg border border-danger/30 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"><UserX className="mr-1 inline h-3.5 w-3.5" />Suspend</button></>}</div> : null}</div>;
}

function ReportRow({ report, pending, onAction }: { report: AdminReport; pending: boolean; onAction: (report: AdminReport, action: "review" | "dismiss" | "remove") => void }): ReactElement {
  const author = report.targetAuthor ?? report.targetUser;
  const authorName = author?.profile?.displayName ?? author?.email;
  const reportedTarget = report.type === "user"
    ? report.targetUser?.profile?.displayName ?? report.targetUser?.email ?? "Unavailable account"
    : report.community?.name ?? report.targetKind.replaceAll("_", " ");
  return (
    <article className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={report.status === "pending" ? "warning" : report.status === "actioned" ? "danger" : "neutral"}>{report.status}</Badge>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">{report.type} · {report.targetKind.replaceAll("_", " ")}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">Reported for: {report.reason.replaceAll("_", " ")} · {reportedTarget}</p>
          <p className="mt-1 text-xs text-muted">Submitted by {report.reporter.profile?.displayName ?? report.reporter.email} · {dateTime(report.createdAt)}</p>
          {authorName ? <p className="mt-2 text-sm text-ink"><span className="font-semibold">{report.type === "user" ? "Reported account:" : "Content author:"}</span> {authorName}{author?.profile?.displayName ? <span className="ml-2 text-xs text-muted">{author.email}</span> : null}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {report.status === "pending" ? <>
            <button type="button" disabled={pending} onClick={() => onAction(report, "review")} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-page disabled:opacity-50">Mark reviewed</button>
            <button type="button" disabled={pending} onClick={() => onAction(report, "dismiss")} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-page disabled:opacity-50">Dismiss</button>
            {report.type !== "user" && report.content ? <button type="button" disabled={pending} onClick={() => onAction(report, "remove")} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50">Remove content</button> : null}
          </> : null}
        </div>
      </div>
      {report.community?.guidelines ? <div className="mt-3 rounded-lg border border-brand/15 bg-brand/5 p-3"><p className="text-xs font-semibold text-navy">Guidelines for {report.community.name}</p><p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-sm text-muted">{report.community.guidelines}</p></div> : null}
      {report.content ? <blockquote className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-page p-3 text-sm text-muted">{report.content}</blockquote> : null}
      {report.details ? <p className="mt-3 text-sm text-muted">Reporter’s details: {report.details}</p> : null}
    </article>
  );
}

function AppealRow({ appeal, pending, onAction }: { appeal: AdminAppeal; pending: boolean; onAction: (appeal: AdminAppeal, action: "accept" | "reject") => void }): ReactElement {
  const memberName = appeal.user.profile?.displayName ?? "Member";
  const accountAction = appeal.adminAction?.action ?? (appeal.user.suspendedAt ? "suspension" : "restriction");
  const accountReason = appeal.user.suspensionReason ?? appeal.user.restrictionReason ?? appeal.adminAction?.reason;
  return (
    <article className="py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge tone={appeal.status === "pending" ? "warning" : appeal.status === "accepted" ? "success" : "neutral"}>{appeal.status}</Badge><span className="text-sm font-semibold text-ink">{memberName} · {appeal.user.email}</span></div>
          <p className="mt-1 text-xs text-muted">Appealed {dateTime(appeal.createdAt)} · {accountAction.replaceAll("_", " ")}</p>
          {accountReason ? <p className="mt-2 text-sm text-muted"><span className="font-semibold text-ink">Original moderation reason:</span> {accountReason}</p> : null}
        </div>
        {appeal.status === "pending" ? <div className="flex gap-2"><button type="button" disabled={pending} onClick={() => onAction(appeal, "reject")} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-page disabled:opacity-50">Deny appeal</button><button type="button" disabled={pending} onClick={() => onAction(appeal, "accept")} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50">Accept & restore</button></div> : null}
      </div>
      <blockquote className="mt-3 whitespace-pre-wrap rounded-lg bg-page p-3 text-sm text-ink">{appeal.message}</blockquote>
      {appeal.resolutionNote ? <p className="mt-2 text-sm text-muted"><span className="font-semibold text-ink">Decision note:</span> {appeal.resolutionNote}</p> : null}
    </article>
  );
}

function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }): ReactElement {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm"><span className="text-muted">{total.toLocaleString()} total · Page {page} of {pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Next</button></div></div>;
}
