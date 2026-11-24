import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Clock3, DollarSign, FolderKanban } from "lucide-react";
import { Avatar, Card, EmptyState, ErrorMessage, Spinner } from "../../components/ui";
import { paths, profilePath } from "../../app/paths";
import { useCurrentUser } from "../auth/authQueries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { marketplaceKeys, useMyProposals, useProject, useProjects } from "./marketplaceQueries";
import * as service from "./marketplaceService";
import type { ProjectDetail, ProjectProposal, ProjectProposalSummary, ProjectSummary, ProposalStatus } from "./marketplace.types";
import { Dialog, Field, controlClass } from "./JobsPage";

const categories = ["technology", "design", "marketing", "writing", "data", "business", "customer_support", "other"];
const actionClass = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const person = (value: { profile: { displayName: string } | null }) => value.profile?.displayName ?? "SkillBridge member";

export function ProjectsPage(): ReactElement { return <ProjectMarketplacePage proposalsOnly={false} />; }
export function MyProjectProposalsPage(): ReactElement { return <ProjectMarketplacePage proposalsOnly />; }

function ProjectMarketplacePage({ proposalsOnly }: { proposalsOnly: boolean }): ReactElement {
  useDocumentTitle(proposalsOnly ? "My proposals | SkillBridge" : "Projects | SkillBridge");
  const { listingId = "" } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mine, setMine] = useState(false);
  const [dialog, setDialog] = useState<"create" | "edit" | "proposal" | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const listQuery = useProjects(search, category, mine);
  const detailQuery = useProject(listingId);
  const proposalsQuery = useMyProposals(proposalsOnly);
  const detail = detailQuery.data;
  const proposals = proposalsQuery.data ?? [];
  const canPost = Boolean(currentUser?.onboardedAt);
  const isOwner = detail?.ownerId === currentUser?.id;
  const canPropose = Boolean(currentUser?.capabilities.includes("professional") && !isOwner);

  async function refresh(id = listingId) {
    await Promise.all([queryClient.invalidateQueries({ queryKey: marketplaceKeys.projects }), queryClient.invalidateQueries({ queryKey: marketplaceKeys.proposals }), ...(id ? [queryClient.invalidateQueries({ queryKey: marketplaceKeys.projectDetail(id) })] : [])]);
  }
  const createMutation = useMutation({ mutationFn: service.createProject, onSuccess: async (created) => { await refresh(created.id); setDialog(null); navigate(`${paths.projects}/${created.id}`); }, onError: () => setError("Could not publish the project. Check the information and try again.") });
  const updateMutation = useMutation({ mutationFn: service.updateProject, onSuccess: async (updated) => { await refresh(updated.id); setDialog(null); }, onError: () => setError("Could not update this project.") });
  const proposalMutation = useMutation({ mutationFn: service.createProjectProposal, onSuccess: async () => { await refresh(); setDialog(null); }, onError: (problem: unknown) => setError(problem instanceof Error ? problem.message : "Could not submit the proposal.") });
  const proposalStatusMutation = useMutation({ mutationFn: service.updateProjectProposal, onSuccess: () => void refresh(), onError: () => setError("Could not update the proposal.") });

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const budget = String(form.get("budget") ?? "").trim();
    const data: Record<string, unknown> = {
      title: String(form.get("title") ?? "").trim(), description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category") ?? "technology"), skills: String(form.get("skills") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      budget: budget ? Number(budget) : null, currency: String(form.get("currency") ?? "USD"),
      deliveryTime: String(form.get("deliveryTime") ?? "").trim() || null,
    };
    if (dialog === "edit" && detail) updateMutation.mutate({ id: detail.id, data }); else createMutation.mutate(data);
  }
  function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return; const form = new FormData(event.currentTarget);
    const budget = String(form.get("proposedBudget") ?? "").trim(); const deliveryTime = String(form.get("deliveryTime") ?? "").trim();
    proposalMutation.mutate({ id: detail.id, coverLetter: String(form.get("coverLetter") ?? "").trim(), ...(budget ? { proposedBudget: Number(budget) } : {}), ...(deliveryTime ? { deliveryTime } : {}) });
  }
  function updateStatus(proposal: ProjectProposal, status: ProposalStatus) {
    if (detail) proposalStatusMutation.mutate({ listingId: detail.id, proposalId: proposal.id, status });
  }
  function setProjectStatus(status: "open" | "in_progress" | "completed" | "cancelled") {
    if (detail) updateMutation.mutate({ id: detail.id, data: { status } });
  }

  return <main className="min-h-screen bg-page px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-brand">SkillBridge marketplace</p><h1 className="mt-1 text-3xl font-bold text-navy">{proposalsOnly ? "My proposals" : "Projects for collaboration"}</h1><p className="mt-2 text-sm text-muted">Find client projects, propose your approach, and collaborate from kickoff to delivery.</p></div>{canPost && !proposalsOnly ? <button type="button" onClick={() => setDialog("create")} className={`${actionClass} bg-navy text-white`}><FolderKanban className="h-4 w-4" />Post a project</button> : null}</header>
    {!proposalsOnly && !listingId ? <div className="mb-5 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap"><input aria-label="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or skills" className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm sm:min-w-52" /><select aria-label="Project category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm sm:w-auto"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select>{canPost ? <button type="button" onClick={() => setMine((value) => !value)} className={`${actionClass} w-full border border-line sm:w-auto ${mine ? "bg-brand/10 text-brand" : "bg-surface"}`}>{mine ? "My projects" : "Manage my projects"}</button> : null}<Link to={paths.projectProposals} className={`${actionClass} w-full border border-line bg-surface sm:w-auto`}>My proposals</Link></div> : null}
    {error ? <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}<button type="button" onClick={() => setError("")} className="ml-3 underline">Dismiss</button></div> : null}
    {proposalsOnly ? <MyProposals rows={proposals} loading={proposalsQuery.isPending} failed={proposalsQuery.isError} onRetry={() => void proposalsQuery.refetch()} /> : listingId ? <ProjectDetailPanel detail={detail} loading={detailQuery.isPending} failed={detailQuery.isError} onRetry={() => void detailQuery.refetch()} isOwner={Boolean(isOwner)} canPropose={canPropose} onBack={() => navigate(paths.projects)} onEdit={() => setDialog("edit")} onPropose={() => setDialog("proposal")} onProposalStatus={updateStatus} onProjectStatus={setProjectStatus} busy={proposalStatusMutation.isPending || updateMutation.isPending} /> : <ProjectList rows={listQuery.data ?? []} loading={listQuery.isPending} failed={listQuery.isError} onRetry={() => void listQuery.refetch()} />}
    {dialog === "create" || dialog === "edit" ? <ProjectFormDialog mode={dialog} project={detail ?? null} busy={createMutation.isPending || updateMutation.isPending} onClose={() => setDialog(null)} onSubmit={submitProject} /> : null}
    {dialog === "proposal" ? <ProposalDialog project={detail?.title ?? "this project"} busy={proposalMutation.isPending} onClose={() => setDialog(null)} onSubmit={submitProposal} /> : null}
  </div></main>;
}

function ProjectList({ rows, loading, failed, onRetry }: { rows: ProjectSummary[]; loading: boolean; failed: boolean; onRetry: () => void }): ReactElement {
  if (loading) return <Card className="flex items-center justify-center gap-3 py-12"><Spinner size="lg" label="Loading projects" /><span className="text-sm text-muted">Loading projects…</span></Card>;
  if (failed) return <ErrorMessage title="Couldn’t load projects" message="Check your connection and try again." onRetry={onRetry} />;
  if (!rows.length) return <Card><EmptyState icon={FolderKanban} title="No projects found" description="Try another search, or check back for new projects." /></Card>;
  return <div className="grid gap-4 md:grid-cols-2">{rows.map((project) => <Link key={project.id} to={`${paths.projects}/${project.id}`}><Card className="h-full transition-colors hover:border-brand/50"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-brand">{pretty(project.category)}</p><h2 className="mt-1 text-lg font-semibold text-navy">{project.title}</h2><p className="mt-1 text-sm text-muted">Posted by {person(project.owner)}</p></div><span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">{pretty(project.status)}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-ink">{project.description}</p><div className="mt-3 flex flex-wrap gap-2">{project.skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-full bg-page px-2.5 py-1 text-xs text-muted">{skill}</span>)}</div><div className="mt-4 flex justify-between border-t border-line pt-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{project.budget == null ? "Budget discussed" : new Intl.NumberFormat(undefined, { style: "currency", currency: project.currency, maximumFractionDigits: 0 }).format(project.budget)}</span><span>{project.proposalCount} proposals</span></div></Card></Link>)}</div>;
}

function ProjectDetailPanel({ detail, loading, failed, onRetry, isOwner, canPropose, onBack, onEdit, onPropose, onProposalStatus, onProjectStatus, busy }: { detail?: ProjectDetail; loading: boolean; failed: boolean; onRetry: () => void; isOwner: boolean; canPropose: boolean; onBack: () => void; onEdit: () => void; onPropose: () => void; onProposalStatus: (proposal: ProjectProposal, status: ProposalStatus) => void; onProjectStatus: (status: "open" | "in_progress" | "completed" | "cancelled") => void; busy: boolean }): ReactElement {
  if (loading) return <Card className="flex items-center justify-center gap-3 py-12"><Spinner size="lg" label="Loading project" /><span className="text-sm text-muted">Loading project details…</span></Card>;
  if (failed || !detail) return <ErrorMessage title="Couldn’t load this project" message="It may have closed or been removed." onRetry={onRetry} />;
  const myProposal = detail.myProposal;
  return <div className="space-y-5"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft className="h-4 w-4" />Back to projects</button><Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand">{pretty(detail.category)}</p><h2 className="mt-1 text-2xl font-bold text-navy">{detail.title}</h2><p className="mt-2 text-sm text-muted">Posted by <Link to={profilePath(detail.ownerId)} className="font-semibold text-navy hover:text-brand">{person(detail.owner)}</Link> · {new Date(detail.createdAt).toLocaleDateString()}</p></div>{isOwner ? <div className="flex flex-wrap gap-2"><button type="button" onClick={onEdit} className={`${actionClass} border border-line bg-surface`}>Edit project</button>{detail.status === "open" ? <button type="button" onClick={() => onProjectStatus("cancelled")} className={`${actionClass} border border-line bg-surface`} disabled={busy}>Close project</button> : detail.status === "in_progress" ? <button type="button" onClick={() => onProjectStatus("completed")} className={`${actionClass} bg-success text-white`} disabled={busy}>Mark completed</button> : detail.status === "cancelled" ? <button type="button" onClick={() => onProjectStatus("open")} className={`${actionClass} border border-line bg-surface`} disabled={busy}>Reopen project</button> : null}</div> : null}</div><div className="mt-4 flex flex-wrap gap-3 text-sm text-muted"><span>{detail.budget == null ? "Budget open to proposals" : new Intl.NumberFormat(undefined, { style: "currency", currency: detail.currency, maximumFractionDigits: 0 }).format(detail.budget)}</span>{detail.deliveryTime ? <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{detail.deliveryTime}</span> : null}<span>{pretty(detail.status)}</span></div>{detail.skills.length ? <div className="mt-4 flex flex-wrap gap-2">{detail.skills.map((skill) => <span key={skill} className="rounded-full bg-page px-3 py-1 text-xs text-muted">{skill}</span>)}</div> : null}<p className="mt-5 whitespace-pre-wrap break-words border-t border-line pt-5 text-sm leading-7">{detail.description}</p>
    {!isOwner && canPropose ? myProposal ? <div className="mt-4 rounded-xl bg-brand/5 p-4"><p className="font-semibold text-navy">Your proposal: {pretty(myProposal.status)}</p>{myProposal.status === "submitted" || myProposal.status === "shortlisted" ? <button type="button" onClick={() => onProposalStatus(myProposal, "withdrawn")} className="mt-3 text-sm font-medium text-danger hover:underline" disabled={busy}>Withdraw proposal</button> : myProposal.status === "accepted" ? <Link to={`${paths.messages}?userId=${encodeURIComponent(detail.ownerId)}`} className="mt-3 inline-flex text-sm font-semibold text-brand">Message the client</Link> : null}</div> : detail.status === "open" ? <button type="button" onClick={onPropose} className={`${actionClass} mt-4 bg-brand text-white`}>Submit a proposal</button> : null : null}
    </Card>
    {isOwner ? <Card><h3 className="text-lg font-semibold text-navy">Proposals ({detail.proposals.length})</h3>{detail.proposals.length ? <div className="mt-4 space-y-4">{detail.proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} currency={detail.currency} onStatus={onProposalStatus} busy={busy} />)}</div> : <p className="mt-2 text-sm text-muted">Proposals will appear here.</p>}</Card> : null}</div>;
}

function ProposalCard({ proposal, currency, onStatus, busy }: { proposal: ProjectProposal; currency: string; onStatus: (proposal: ProjectProposal, status: ProposalStatus) => void; busy: boolean }): ReactElement {
  return <div className="rounded-xl border border-line p-4"><div className="flex items-start gap-3"><Link to={profilePath(proposal.author.id)}><Avatar name={person(proposal.author)} src={proposal.author.profile?.avatarUrl ?? null} size="md" /></Link><div className="min-w-0 flex-1"><Link to={profilePath(proposal.author.id)} className="font-semibold text-navy hover:text-brand">{person(proposal.author)}</Link><p className="text-xs text-muted">{proposal.author.profile?.headline ?? "Professional"} · {new Date(proposal.createdAt).toLocaleDateString()}</p></div><span className="rounded-full bg-page px-2.5 py-1 text-xs">{pretty(proposal.status)}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{proposal.coverLetter}</p><p className="mt-3 text-sm text-muted">Offer: {proposal.proposedBudget == null ? "Budget open" : new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(proposal.proposedBudget)}{proposal.deliveryTime ? ` · ${proposal.deliveryTime}` : ""}</p><div className="mt-3 flex flex-wrap gap-2">{proposal.status === "accepted" ? <Link to={`${paths.messages}?userId=${encodeURIComponent(proposal.author.id)}`} className={`${actionClass} bg-brand/10 text-brand`}>Message professional</Link> : proposal.status === "submitted" || proposal.status === "shortlisted" ? <><button type="button" onClick={() => onStatus(proposal, "shortlisted")} className={`${actionClass} border border-line`} disabled={busy}>Shortlist</button><button type="button" onClick={() => onStatus(proposal, "accepted")} className={`${actionClass} bg-success text-white`} disabled={busy}>Accept proposal</button><button type="button" onClick={() => onStatus(proposal, "rejected")} className={`${actionClass} text-danger`} disabled={busy}>Decline</button></> : null}</div></div>;
}

function MyProposals({ rows, loading, failed, onRetry }: { rows: ProjectProposalSummary[]; loading: boolean; failed: boolean; onRetry: () => void }): ReactElement {
  if (loading) return <Card className="flex justify-center py-10"><Spinner size="lg" label="Loading proposals" /></Card>;
  if (failed) return <ErrorMessage title="Couldn’t load your proposals" message="Please try again." onRetry={onRetry} />;
  if (!rows.length) return <Card><EmptyState icon={Briefcase} title="No proposals yet" description="Send a proposal to a project to track it here." /></Card>;
  return <div className="space-y-3">{rows.map((proposal) => <Card key={proposal.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><Link to={`${paths.projects}/${proposal.project.id}`} className="font-semibold text-navy hover:text-brand">{proposal.project.title}</Link><p className="mt-1 text-sm text-muted">{person(proposal.project.owner)} · {pretty(proposal.project.category)}</p></div><span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{pretty(proposal.status)}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-ink">{proposal.coverLetter}</p><p className="mt-3 text-xs text-muted">Updated {new Date(proposal.updatedAt).toLocaleDateString()}</p></Card>)}</div>;
}

function ProjectFormDialog({ mode, project, busy, onClose, onSubmit }: { mode: "create" | "edit"; project: ProjectDetail | null; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }): ReactElement {
  return <Dialog title={mode === "create" ? "Post a project" : "Edit project listing"} onClose={onClose}><form onSubmit={onSubmit} className="space-y-3"><Field label="Project title"><input name="title" required minLength={5} maxLength={140} defaultValue={project?.title} className={controlClass} placeholder="e.g. Build a portfolio website" /></Field><Field label="Project description"><textarea name="description" required minLength={30} maxLength={8000} rows={5} defaultValue={project?.description} className={controlClass} placeholder="Describe the outcome, requirements, and deliverables." /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><select name="category" defaultValue={project?.category ?? "technology"} className={controlClass}>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></Field><Field label="Budget"><input name="budget" type="number" min="0.01" step="0.01" defaultValue={project?.budget ?? ""} className={controlClass} /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Currency"><select name="currency" defaultValue={project?.currency ?? "USD"} className={controlClass}><option>USD</option><option>NGN</option><option>GBP</option><option>EUR</option></select></Field><Field label="Target delivery"><input name="deliveryTime" maxLength={100} defaultValue={project?.deliveryTime ?? ""} className={controlClass} placeholder="e.g. 3 weeks" /></Field></div><Field label="Skills needed (comma-separated)"><input name="skills" maxLength={800} defaultValue={project?.skills.join(", ")} className={controlClass} placeholder="React, Figma, copywriting" /></Field><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2"><button type="button" onClick={onClose} className={`${actionClass} border border-line`}>Cancel</button><button type="submit" disabled={busy} className={`${actionClass} bg-navy text-white`}>{busy ? "Saving…" : mode === "create" ? "Publish project" : "Save changes"}</button></div></form></Dialog>;
}

function ProposalDialog({ project, busy, onClose, onSubmit }: { project: string; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }): ReactElement {
  return <Dialog title={`Propose for ${project}`} onClose={onClose}><form onSubmit={onSubmit} className="space-y-3"><Field label="Proposal"><textarea name="coverLetter" required minLength={30} maxLength={5000} rows={7} className={controlClass} placeholder="Explain your approach, experience, and why you’re a good fit." /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Your proposed budget"><input name="proposedBudget" type="number" min="0.01" step="0.01" className={controlClass} /></Field><Field label="Estimated delivery time"><input name="deliveryTime" maxLength={100} className={controlClass} placeholder="e.g. 2 weeks" /></Field></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2"><button type="button" onClick={onClose} className={`${actionClass} border border-line`}>Cancel</button><button type="submit" disabled={busy} className={`${actionClass} bg-brand text-white`}>{busy ? "Submitting…" : "Submit proposal"}</button></div></form></Dialog>;
}
