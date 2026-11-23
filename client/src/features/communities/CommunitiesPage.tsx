import { useMemo, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Flag, FolderPlus, MessagesSquare, Search, Settings2, ShieldCheck, Trash2, Users, X, Phone, Video, UserPlus, ImagePlus } from "lucide-react";
import { Avatar, Card, EmptyState, ErrorMessage, Spinner } from "../../components/ui";
import { useCurrentUser } from "../auth/authQueries";
import { profilePath } from "../../app/paths";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { communityKeys, useCommunities, useCommunity } from "./communitiesQueries";
import * as service from "./communitiesService";
import type { CommunityDetail, CommunitySummary } from "./communities.types";
import { getActiveCommunityCall, startCall } from "../calls/callsService";
import { paths } from "../../app/paths";
import { useConnections } from "../connections/connectionsQueries";
import { uploadPostMedia } from "../posts/postsService";
import { VoiceDictationButton } from "../../components/ui/VoiceDictationButton";

const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = `${buttonClass} bg-navy text-white hover:bg-navy/90`;
const secondaryClass = `${buttonClass} border border-line bg-surface text-ink hover:bg-page`;
const reasons = [["spam", "Spam or scam"], ["harassment", "Harassment"], ["inappropriate_content", "Inappropriate content"], ["misinformation", "Misinformation"], ["other", "Other"]];

function personName(person: { profile: { displayName: string | null } | null }, fallback: string): string {
  return person.profile?.displayName || fallback;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CommunitiesPage(): ReactElement {
  useDocumentTitle("Community | SkillBridge");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedId = params.get("communityId") ?? "";
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null | undefined>(undefined);
  const [discussion, setDiscussion] = useState("");
  const [discussionMedia, setDiscussionMedia] = useState<File | null>(null);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const communitiesQuery = useCommunities(search, mine);
  const communityQuery = useCommunity(selectedId);
  const community = communityQuery.data;
  const activeCallQuery = useQuery({ queryKey: ["calls", "community", selectedId], queryFn: () => getActiveCommunityCall(selectedId), enabled: Boolean(selectedId && communityQuery.data?.myRole), refetchInterval: 15000 });
  const invitationQuery = useQuery({ queryKey: [...communityKeys.all, "invitations"], queryFn: service.listCommunityInvitations, staleTime: 15000 });
  const connectionsQuery = useConnections("accepted", Boolean(community?.myRole));
  const communities = useMemo(() => communitiesQuery.data ?? [], [communitiesQuery.data]);
  const isModerator = community?.myRole === "owner" || community?.myRole === "moderator";
  const isOwner = community?.myRole === "owner";
  const listById = useMemo(() => new Map(communities.map((item) => [item.id, item])), [communities]);

  function selectCommunity(id: string) {
    const next = new URLSearchParams(params);
    next.set("communityId", id);
    setParams(next);
    setError("");
  }

  async function refreshCommunity(id = selectedId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: communityKeys.list(search, mine) }),
      ...(id ? [queryClient.invalidateQueries({ queryKey: communityKeys.detail(id) })] : []),
    ]);
  }

  const createMutation = useMutation({ mutationFn: service.createCommunity, onSuccess: async (created) => {
    await queryClient.invalidateQueries({ queryKey: communityKeys.all });
    setFormMode(null); selectCommunity(created.id);
  }, onError: () => setError("Could not create the group. Check the fields and try again.") });
  const updateMutation = useMutation({ mutationFn: service.updateCommunity, onSuccess: async (updated) => {
    await queryClient.invalidateQueries({ queryKey: communityKeys.all });
    queryClient.setQueryData(communityKeys.detail(updated.id), updated); setFormMode(null);
  }, onError: () => setError("Could not save group settings. Please try again.") });
  const joinMutation = useMutation({ mutationFn: service.joinCommunity, onSuccess: async (updated) => {
    queryClient.setQueryData(communityKeys.detail(updated.id), updated); await refreshCommunity(updated.id);
  }, onError: () => setError("Could not join this group. Please try again.") });
  const leaveMutation = useMutation({ mutationFn: service.leaveCommunity, onSuccess: async () => {
    await refreshCommunity();
  }, onError: () => setError("Could not leave this group. Owners must delete the group or assign another owner.") });
  const postMutation = useMutation({ mutationFn: service.createDiscussion, onSuccess: async () => {
    setDiscussion(""); setDiscussionMedia(null); await refreshCommunity();
  }, onError: () => setError("Could not publish your discussion. Please try again.") });
  const replyMutation = useMutation({ mutationFn: service.createReply, onSuccess: async (_data, variables) => {
    setReplyDrafts((current) => ({ ...current, [variables.postId]: "" })); await refreshCommunity();
  }, onError: () => setError("Could not add your reply. Please try again.") });
  const deletePostMutation = useMutation({ mutationFn: service.deleteDiscussion, onSuccess: () => void refreshCommunity(), onError: () => setError("Could not remove this discussion.") });
  const deleteReplyMutation = useMutation({ mutationFn: service.deleteReply, onSuccess: () => void refreshCommunity(), onError: () => setError("Could not remove this reply.") });
  const removeMemberMutation = useMutation({ mutationFn: service.removeCommunityMember, onSuccess: () => void refreshCommunity(), onError: () => setError("Could not remove this member.") });
  const memberRoleMutation = useMutation({ mutationFn: service.updateCommunityMemberRole, onSuccess: () => void refreshCommunity(), onError: () => setError("Could not update this member’s role.") });
  const deleteCommunityMutation = useMutation({ mutationFn: service.deleteCommunity, onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: communityKeys.all });
    const next = new URLSearchParams(params); next.delete("communityId"); setParams(next);
  }, onError: () => setError("Could not delete this group.") });
  const reportMutation = useMutation({ mutationFn: service.reportCommunity, onSuccess: () => {
    setReportPostId(undefined); setError("Your report was submitted for review.");
  }, onError: () => setError("Could not submit your report.") });
  const resolveMutation = useMutation({ mutationFn: service.resolveCommunityReport, onSuccess: () => void refreshCommunity(), onError: () => setError("Could not update this report.") });
  const invitationMutation = useMutation({ mutationFn: service.inviteCommunityMember, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: [...communityKeys.all, "invitations"] }); setError("Invitation sent."); }, onError: (problem) => setError(problem instanceof Error ? problem.message : "Could not send this invitation.") });
  const respondInvitationMutation = useMutation({ mutationFn: service.respondToCommunityInvitation, onSuccess: async (result) => { await queryClient.invalidateQueries({ queryKey: [...communityKeys.all, "invitations"] }); if (result.status === "accepted") { setMine(true); selectCommunity(result.communityId); await queryClient.invalidateQueries({ queryKey: communityKeys.all }); } }, onError: () => setError("Could not update this invitation.") });

  function submitDiscussion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!community || (!discussion.trim() && !discussionMedia)) return;
    setError("");
    void (async () => {
      try {
        const media = discussionMedia ? await uploadPostMedia(discussionMedia) : null;
        postMutation.mutate({ communityId: community.id, content: discussion.trim(), ...(media ? { mediaUrl: media.mediaUrl, mediaType: media.mediaType } : {}) });
      } catch { setError("Could not upload that image or video."); }
    })();
  }

  function submitReply(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const content = replyDrafts[postId]?.trim();
    if (!community || !content) return;
    replyMutation.mutate({ communityId: community.id, postId, content });
  }

  function submitGroupForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = { name: String(data.get("name") ?? "").trim(), description: String(data.get("description") ?? "").trim(), guidelines: String(data.get("guidelines") ?? "").trim() };
    if (formMode === "edit" && community) updateMutation.mutate({ id: community.id, ...input });
    else createMutation.mutate(input);
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!community || reportPostId === undefined) return;
    const data = new FormData(event.currentTarget);
    const details = String(data.get("details") ?? "").trim();
    reportMutation.mutate({ communityId: community.id, ...(reportPostId ? { postId: reportPostId } : {}), reason: String(data.get("reason") ?? "other"), ...(details ? { details } : {}) });
  }

  return (
    <main className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-brand">Learn together</p><h1 className="mt-1 text-3xl font-bold text-navy">Community &amp; groups</h1><p className="mt-2 max-w-2xl text-sm text-muted">Find your people, share your work, and build knowledge together.</p></div>
          <button type="button" onClick={() => { setError(""); setFormMode("create"); }} className={primaryClass}><FolderPlus className="h-4 w-4" />Create a group</button>
        </header>
        {invitationQuery.data?.length ? <Card><h2 className="font-semibold text-navy">Community invitations ({invitationQuery.data.length})</h2><div className="mt-3 space-y-2">{invitationQuery.data.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3"><div><p className="font-medium text-ink">{invite.community.name}</p><p className="text-xs text-muted">Invited by {personName(invite.inviter, "SkillBridge member")}</p></div><div className="flex gap-2"><button type="button" onClick={() => respondInvitationMutation.mutate({ invitationId: invite.id, status: "declined" })} className={secondaryClass}>Decline</button><button type="button" onClick={() => respondInvitationMutation.mutate({ invitationId: invite.id, status: "accepted" })} disabled={respondInvitationMutation.isPending} className={primaryClass}>Accept</button></div></div>)}</div></Card> : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <aside className="space-y-4">
            <Card padding="md">
              <label className="relative block"><span className="sr-only">Search communities</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input aria-label="Search communities" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups" className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" /></label>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => setMine(false)} className={`${buttonClass} flex-1 ${!mine ? "bg-brand/10 text-brand" : "text-muted hover:bg-page"}`}>Discover</button><button type="button" onClick={() => setMine(true)} className={`${buttonClass} flex-1 ${mine ? "bg-brand/10 text-brand" : "text-muted hover:bg-page"}`}>My groups</button></div>
            </Card>
            {communitiesQuery.isPending ? <Card className="flex items-center justify-center gap-3 py-8"><Spinner size="md" label="Loading groups" /><span className="text-sm text-muted">Loading groups…</span></Card> : null}
            {communitiesQuery.isError ? <ErrorMessage title="Couldn’t load groups" message="Check your connection and try again." onRetry={() => void communitiesQuery.refetch()} /> : null}
            {!communitiesQuery.isPending && !communitiesQuery.isError && communities.length === 0 ? <Card><EmptyState icon={Users} title={mine ? "No groups yet" : "No groups found"} description={mine ? "Join a group or create one to start connecting." : "Try another search, or create the first group."} /></Card> : null}
            <div className="space-y-3">
              {communities.map((item) => <CommunityListCard key={item.id} community={item} selected={selectedId === item.id} onSelect={() => selectCommunity(item.id)} onJoin={() => joinMutation.mutate(item.id)} busy={joinMutation.isPending} />)}
            </div>
          </aside>

          <section className="min-w-0 space-y-5">
            {error ? <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${error.startsWith("Your report") ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}>{error}<button type="button" onClick={() => setError("")} className="ml-3 underline">Dismiss</button></div> : null}
            {!selectedId ? <Card className="flex min-h-80 items-center justify-center"><EmptyState icon={MessagesSquare} title="Pick a group to get started" description="Explore the group directory or create a new space for your community." /></Card> : null}
            {selectedId && communityQuery.isPending ? <Card className="flex items-center justify-center gap-3 py-12"><Spinner size="lg" label="Loading group" /><span className="text-sm text-muted">Loading community…</span></Card> : null}
            {selectedId && communityQuery.isError ? <ErrorMessage title="Couldn’t load this group" message="It may have been deleted, or your access may have changed." onRetry={() => void communityQuery.refetch()} /> : null}
            {community ? <CommunityDetailView
              community={community} currentUserId={currentUser?.id ?? ""} isModerator={Boolean(isModerator)} isOwner={Boolean(isOwner)}
              discussion={discussion} onDiscussionChange={setDiscussion} onSubmitDiscussion={submitDiscussion} discussionBusy={postMutation.isPending}
              discussionMedia={discussionMedia} onDiscussionMediaChange={setDiscussionMedia}
              replyDrafts={replyDrafts} onReplyChange={(id, value) => setReplyDrafts((current) => ({ ...current, [id]: value }))} onSubmitReply={submitReply} replyBusy={replyMutation.isPending}
              onJoin={() => joinMutation.mutate(community.id)} onLeave={() => leaveMutation.mutate(community.id)} membershipBusy={joinMutation.isPending || leaveMutation.isPending}
              activeCall={activeCallQuery.data ?? null} onStartCall={(mode) => { void startCall({ kind: "community", communityId: community.id, mode }).then((room) => navigate(`${paths.calls}/${room.id}`)).catch(() => setError("Could not start the community call. Please try again.")); }} onJoinCall={() => activeCallQuery.data && navigate(`${paths.calls}/${activeCallQuery.data.id}`)}
              onEdit={() => setFormMode("edit")} onDeleteCommunity={() => { if (window.confirm(`Delete “${community.name}”? Its discussions, membership, and reports will also be removed.`)) deleteCommunityMutation.mutate(community.id); }}
              onDeletePost={(postId) => deletePostMutation.mutate({ communityId: community.id, postId })} onDeleteReply={(postId, commentId) => deleteReplyMutation.mutate({ communityId: community.id, postId, commentId })}
              onRemoveMember={(memberId) => removeMemberMutation.mutate({ communityId: community.id, memberId })}
              onMemberRole={(memberId, role) => memberRoleMutation.mutate({ communityId: community.id, memberId, role })}
              onReport={(postId) => { setReportPostId(postId); setError(""); }}
              onResolveReport={(reportId, status, removePost) => resolveMutation.mutate({ communityId: community.id, reportId, status, removePost })}
            /> : null}
            {community?.myRole ? <button type="button" onClick={() => setInviteDialog(true)} className={secondaryClass}><UserPlus className="h-4 w-4" />Invite connections</button> : null}
          </section>
        </div>
      </div>

      {formMode ? <GroupDialog mode={formMode} community={community ?? listById.get(selectedId) ?? null} busy={createMutation.isPending || updateMutation.isPending} onClose={() => setFormMode(null)} onSubmit={submitGroupForm} /> : null}
      {inviteDialog && community ? <InviteConnectionsDialog communityName={community.name} memberIds={new Set(community.members.map((member) => member.userId))} connections={connectionsQuery.data ?? []} busy={invitationMutation.isPending || connectionsQuery.isPending} onClose={() => setInviteDialog(false)} onInvite={(userId) => invitationMutation.mutate({ communityId: community.id, userId })} /> : null}
      {reportPostId !== undefined ? <ReportDialog busy={reportMutation.isPending} onClose={() => setReportPostId(undefined)} onSubmit={submitReport} /> : null}
    </main>
  );
}

function CommunityListCard({ community, selected, onSelect, onJoin, busy }: { community: CommunitySummary; selected: boolean; onSelect: () => void; onJoin: () => void; busy: boolean }): ReactElement {
  return <Card padding="md" className={`transition-colors ${selected ? "border-brand ring-1 ring-brand/20" : "hover:border-brand/40"}`}>
    <button type="button" onClick={onSelect} className="w-full text-left"><h2 className="font-semibold text-navy">{community.name}</h2><p className="mt-1 line-clamp-2 text-sm text-muted">{community.description}</p><span className="mt-3 flex items-center gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{community.memberCount}</span><span className="inline-flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" />{community.postCount}</span></span></button>
    {community.myRole ? <span className="mt-3 inline-flex rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">{community.myRole === "owner" ? "Owner" : community.myRole === "moderator" ? "Moderator" : "Member"}</span> : <button type="button" onClick={onJoin} disabled={busy} className={`${secondaryClass} mt-3 w-full`}>Join group</button>}
  </Card>;
}

function CommunityDetailView(props: {
  community: CommunityDetail; currentUserId: string; isModerator: boolean; isOwner: boolean;
  discussion: string; onDiscussionChange: (value: string) => void; onSubmitDiscussion: (event: FormEvent<HTMLFormElement>) => void; discussionBusy: boolean; discussionMedia: File | null; onDiscussionMediaChange: (file: File | null) => void;
  replyDrafts: Record<string, string>; onReplyChange: (id: string, value: string) => void; onSubmitReply: (event: FormEvent<HTMLFormElement>, postId: string) => void; replyBusy: boolean;
  onJoin: () => void; onLeave: () => void; membershipBusy: boolean; onEdit: () => void; onDeleteCommunity: () => void;
  activeCall: import("../calls/callsService").CallRoom | null; onStartCall: (mode: "audio" | "video") => void; onJoinCall: () => void;
  onDeletePost: (id: string) => void; onDeleteReply: (postId: string, id: string) => void; onRemoveMember: (id: string) => void;
  onMemberRole: (id: string, role: "moderator" | "member") => void;
  onReport: (postId: string | null) => void; onResolveReport: (id: string, status: "reviewed" | "dismissed", removePost?: boolean) => void;
}): ReactElement {
  const { community: c } = props;
  return <>
    <Card className="overflow-hidden" padding="none">
      <div className="h-2 bg-linear-to-r from-brand to-navy" />
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-brand">SkillBridge group</p><h2 className="mt-1 break-words text-2xl font-bold text-navy">{c.name}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{c.description}</p><p className="mt-3 text-xs text-muted">Created by {personName(c.owner, "Member")} · {c.memberCount} members · {c.postCount} discussions</p></div>
          <div className="flex flex-wrap gap-2">{c.myRole ? <><button type="button" className={secondaryClass} onClick={() => props.onStartCall("audio")}><Phone className="h-4 w-4" />Voice call</button><button type="button" className={secondaryClass} onClick={() => props.onStartCall("video")}><Video className="h-4 w-4" />Video call</button></> : <button type="button" className={primaryClass} onClick={props.onJoin} disabled={props.membershipBusy}>Join group</button>}{props.activeCall ? <button type="button" className={`${primaryClass} bg-success`} onClick={props.onJoinCall}>Join active call</button> : null}{c.myRole ? <button type="button" className={secondaryClass} onClick={props.onLeave} disabled={props.membershipBusy || c.myRole === "owner"}>{c.myRole === "owner" ? "Group owner" : "Leave group"}</button> : null}{props.isModerator ? <button type="button" onClick={props.onEdit} className={secondaryClass}><Settings2 className="h-4 w-4" />Manage</button> : null}<button type="button" onClick={() => props.onReport(null)} className={secondaryClass} aria-label="Report group"><Flag className="h-4 w-4" />Report</button>{props.isOwner ? <button type="button" onClick={props.onDeleteCommunity} className="rounded-lg p-2 text-danger hover:bg-danger/10" aria-label="Delete group"><Trash2 className="h-4 w-4" /></button> : null}</div>
        </div>
        {c.guidelines ? <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 p-4"><h3 className="font-semibold text-navy">Group guidelines</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">{c.guidelines}</p></div> : null}
      </div>
    </Card>

    {props.isModerator && c.reports.length ? <Card><h3 className="flex items-center gap-2 font-semibold text-navy"><ShieldCheck className="h-5 w-5 text-brand" />Reports for review ({c.reports.length})</h3><div className="mt-3 space-y-3">{c.reports.map((report) => <div key={report.id} className="rounded-lg border border-line p-3"><p className="text-sm font-medium">{report.reason.replaceAll("_", " ")} · reported by {personName(report.reporter, "Member")}</p>{report.details ? <p className="mt-1 text-sm text-muted">{report.details}</p> : null}{report.post ? <p className="mt-2 line-clamp-3 rounded bg-page p-2 text-xs text-muted">{report.post.content}</p> : <p className="mt-2 text-xs text-muted">Report about this group</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" className={secondaryClass} onClick={() => props.onResolveReport(report.id, "dismissed")}>Dismiss</button><button type="button" className={secondaryClass} onClick={() => props.onResolveReport(report.id, "reviewed", Boolean(report.postId))}>{report.postId ? "Remove content & review" : "Mark reviewed"}</button></div></div>)}</div></Card> : null}

    {c.myRole ? <form onSubmit={props.onSubmitDiscussion}><Card><label htmlFor="community-discussion" className="font-semibold text-navy">Start a discussion</label><textarea id="community-discussion" value={props.discussion} onChange={(event) => props.onDiscussionChange(event.target.value)} maxLength={3000} rows={3} placeholder={`Share something with ${c.name}…`} className="mt-3 w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" /><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:bg-page"><ImagePlus className="h-4 w-4" />Photo/video<input type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => props.onDiscussionMediaChange(event.currentTarget.files?.[0] ?? null)} /></label><VoiceDictationButton onText={(text) => props.onDiscussionChange(`${props.discussion}${props.discussion ? " " : ""}${text}`)} /><span className="text-xs text-muted">{props.discussionMedia?.name ?? "Keep it constructive."}</span></div><button type="submit" className={primaryClass} disabled={(!props.discussion.trim() && !props.discussionMedia) || props.discussionBusy}>{props.discussionBusy ? "Posting…" : "Post discussion"}</button></div></Card></form> : <Card className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-navy">Join the conversation</h3><p className="mt-1 text-sm text-muted">Become a member to read discussions and post replies.</p></div><button type="button" onClick={props.onJoin} disabled={props.membershipBusy} className={primaryClass}>Join group</button></Card>}

    {c.myRole ? <Card><div className="flex items-center justify-between"><h3 className="font-semibold text-navy">Members</h3><span className="text-xs text-muted">Showing {c.members.length} of {c.memberCount}</span></div><div className="mt-4 flex flex-wrap gap-2">{c.members.map((member) => <div key={member.userId} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2"><Link to={profilePath(member.userId)} aria-label={`View ${personName(member.user, "Member")}'s profile`} className="shrink-0 rounded-full"><Avatar name={personName(member.user, "Member")} src={member.user.profile?.avatarUrl ?? null} size="sm" /></Link><Link to={profilePath(member.userId)} className="max-w-36 truncate text-xs font-medium text-ink hover:text-brand">{personName(member.user, "Member")}</Link><span className="text-[10px] uppercase text-muted">{member.role}</span>{props.isOwner && member.role !== "owner" && member.userId !== props.currentUserId ? <button type="button" onClick={() => props.onMemberRole(member.userId, member.role === "moderator" ? "member" : "moderator")} title={member.role === "moderator" ? "Remove moderator role" : "Make moderator"} className="rounded-full p-1 text-muted hover:bg-brand/10 hover:text-brand"><Settings2 className="h-3 w-3" /></button> : null}{props.isModerator && (member.role === "member" || props.isOwner) && member.role !== "owner" && member.userId !== props.currentUserId ? <button type="button" onClick={() => props.onRemoveMember(member.userId)} aria-label={`Remove ${personName(member.user, "member")}`} className="rounded-full p-1 text-muted hover:bg-danger/10 hover:text-danger"><X className="h-3 w-3" /></button> : null}</div>)}</div></Card> : null}

    <div className="space-y-4"><h3 className="flex items-center gap-2 text-lg font-semibold text-navy"><MessagesSquare className="h-5 w-5" />Discussions</h3>{c.myRole && !c.posts.length ? <Card><EmptyState icon={MessagesSquare} title="No discussions yet" description="Start the first conversation in this group." /></Card> : null}{c.myRole && c.posts.map((post) => <Card key={post.id}>
      <div className="flex items-start gap-3"><Link to={profilePath(post.author.id)} aria-label={`View ${personName(post.author, "Member")}'s profile`} className="shrink-0 rounded-full"><Avatar name={personName(post.author, "Member")} src={post.author.profile?.avatarUrl ?? null} size="md" /></Link><div className="min-w-0 flex-1"><Link to={profilePath(post.author.id)} className="font-semibold text-navy hover:text-brand">{personName(post.author, "Member")}</Link><p className="text-xs text-muted">{dateLabel(post.createdAt)}</p></div><button type="button" onClick={() => props.onReport(post.id)} className="rounded-lg p-2 text-muted hover:bg-page" title="Report discussion" aria-label="Report discussion"><Flag className="h-4 w-4" /></button>{(props.isModerator || post.authorId === props.currentUserId) ? <button type="button" onClick={() => { if (window.confirm("Remove this discussion and its replies?")) props.onDeletePost(post.id); }} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" title="Delete discussion" aria-label="Delete discussion"><Trash2 className="h-4 w-4" /></button> : null}</div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{post.content}</p>
      {post.mediaUrl ? post.mediaType === "video" ? <video src={post.mediaUrl} controls playsInline className="mt-3 max-h-[28rem] w-full rounded-xl bg-black" /> : <CommunityPostImage src={post.mediaUrl} /> : null}
      {post.comments.length ? <div className="mt-4 space-y-3 border-l-2 border-line pl-4">{post.comments.map((comment) => <div key={comment.id} className="flex items-start gap-2"><Link to={profilePath(comment.author.id)} aria-label={`View ${personName(comment.author, "Member")}'s profile`} className="shrink-0 rounded-full"><Avatar name={personName(comment.author, "Member")} src={comment.author.profile?.avatarUrl ?? null} size="sm" /></Link><div className="min-w-0 flex-1 rounded-xl bg-page px-3 py-2"><div className="flex flex-wrap items-center gap-x-2"><Link to={profilePath(comment.author.id)} className="text-xs font-semibold text-navy hover:text-brand">{personName(comment.author, "Member")}</Link><span className="text-[10px] text-muted">{dateLabel(comment.createdAt)}</span></div><p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{comment.content}</p></div>{(props.isModerator || comment.authorId === props.currentUserId) ? <button type="button" onClick={() => props.onDeleteReply(post.id, comment.id)} aria-label="Delete reply" className="rounded p-1 text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div>)}</div> : null}
      <form onSubmit={(event) => props.onSubmitReply(event, post.id)} className="mt-4 flex gap-2"><input aria-label="Write a reply" value={props.replyDrafts[post.id] ?? ""} onChange={(event) => props.onReplyChange(post.id, event.target.value)} maxLength={2000} placeholder="Write a reply…" className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" /><button type="submit" disabled={!props.replyDrafts[post.id]?.trim() || props.replyBusy} className={secondaryClass}>Reply</button></form>
    </Card>)}</div>
  </>;
}

function CommunityPostImage({ src }: { src: string }): ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) return <a href={src} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl border border-line bg-page p-4 text-sm font-medium text-brand underline">Image could not be previewed. Open the attachment.</a>;
  return <img src={src} alt="Community post attachment" onError={() => setFailed(true)} className="mt-3 block max-h-[28rem] min-h-24 w-full rounded-xl bg-page object-contain" />;
}

function GroupDialog({ mode, community, busy, onClose, onSubmit }: { mode: "create" | "edit"; community: CommunitySummary | null; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }): ReactElement {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="group-dialog-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="group-dialog-title" className="text-xl font-bold text-navy">{mode === "create" ? "Create a group" : "Manage group"}</h2><p className="mt-1 text-sm text-muted">Set the purpose and guidelines for your community.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-page"><X className="h-5 w-5" /></button></div><form onSubmit={onSubmit} className="mt-5 space-y-4"><label className="block text-sm font-medium text-ink">Group name<input name="name" required minLength={3} maxLength={80} defaultValue={community?.name} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm" placeholder="e.g. Product Designers" /></label><label className="block text-sm font-medium text-ink">Description<textarea name="description" required minLength={10} maxLength={600} rows={3} defaultValue={community?.description} className="mt-1.5 w-full rounded-lg border border-line bg-surface p-3 text-sm" placeholder="What is this group for?" /></label><label className="block text-sm font-medium text-ink">Guidelines <span className="font-normal text-muted">(optional)</span><textarea name="guidelines" maxLength={5000} rows={4} defaultValue={community?.guidelines} className="mt-1.5 w-full rounded-lg border border-line bg-surface p-3 text-sm" placeholder="Set expectations for posts and replies." /></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={secondaryClass}>Cancel</button><button type="submit" disabled={busy} className={primaryClass}>{busy ? "Saving…" : mode === "create" ? "Create group" : "Save changes"}</button></div></form></section></div>;
}

function InviteConnectionsDialog({ communityName, memberIds, connections, busy, onClose, onInvite }: { communityName: string; memberIds: Set<string>; connections: import("../connections/connections.types").Connection[]; busy: boolean; onClose: () => void; onInvite: (userId: string) => void }): ReactElement {
  const candidates = connections.filter((connection) => !memberIds.has(connection.user.userId));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="invite-title" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="invite-title" className="text-xl font-bold text-navy">Invite connections</h2><p className="mt-1 text-sm text-muted">Invite your connections to {communityName}.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-page"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-2">{busy && !connections.length ? <p className="py-6 text-center text-sm text-muted">Loading connections…</p> : candidates.length ? candidates.map((connection) => <div key={connection.user.userId} className="flex items-center gap-3 rounded-lg border border-line p-3"><Avatar name={connection.user.displayName} src={connection.user.avatarUrl} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{connection.user.displayName}</span><button type="button" disabled={busy} onClick={() => onInvite(connection.user.userId)} className={secondaryClass}><UserPlus className="h-4 w-4" />Invite</button></div>) : <p className="py-6 text-center text-sm text-muted">All your connections are already members, or you have no connections yet.</p>}</div></section></div>;
}

function ReportDialog({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }): ReactElement {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="community-report-title" className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="community-report-title" className="text-lg font-bold text-navy">Report to moderators</h2><p className="mt-1 text-sm text-muted">Your report will be visible to group moderators.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-page"><X className="h-5 w-5" /></button></div><form onSubmit={onSubmit} className="mt-5 space-y-4"><label className="block text-sm font-medium">Reason<select name="reason" defaultValue="spam" className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5">{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-medium">Details <span className="font-normal text-muted">(optional)</span><textarea name="details" maxLength={1000} rows={4} className="mt-1.5 w-full rounded-lg border border-line bg-surface p-3 text-sm" placeholder="Give moderators helpful context." /></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={secondaryClass}>Cancel</button><button type="submit" disabled={busy} className={primaryClass}>{busy ? "Sending…" : "Submit report"}</button></div></form></section></div>;
}
