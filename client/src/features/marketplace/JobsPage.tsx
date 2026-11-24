import { useState } from "react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BriefcaseBusiness, MapPin, Search, UserRound, X } from "lucide-react";
import { useCurrentUser } from "../auth/authQueries";
import { paths, profilePath } from "../../app/paths";
import { Avatar, Card, EmptyState, ErrorMessage, Spinner } from "../../components/ui";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { apiBaseURL } from "../../services/apiClient";
import { marketplaceKeys, useJob, useJobs, useMyApplications } from "./marketplaceQueries";
import * as service from "./marketplaceService";
import type { ApplicationStatus, InterviewSummary, JobApplication, JobApplicationSummary, JobDetail, JobSummary } from "./marketplace.types";
import { startCall } from "../calls/callsService";

const categories = ["technology", "design", "marketing", "writing", "data", "business", "customer_support", "other"];
const kinds = ["full_time", "part_time", "contract", "internship"];
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const actionClass = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

export function JobsPage(): ReactElement { return <JobMarketplacePage applicationsOnly={false} />; }
export function MyJobApplicationsPage(): ReactElement { return <JobMarketplacePage applicationsOnly />; }

function JobMarketplacePage({ applicationsOnly }: { applicationsOnly: boolean }): ReactElement {
  useDocumentTitle(applicationsOnly ? "My applications | SkillBridge" : "Jobs | SkillBridge");
  const { listingId = "" } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [remote, setRemote] = useState("");
  const [status, setStatus] = useState("open");
  const [mine, setMine] = useState(false);
  const [dialog, setDialog] = useState<"create" | "edit" | "apply" | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<JobApplication | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const listingQuery = useJobs(search, category, mine, { status, employmentType, remote });
  const detailQuery = useJob(listingId);
  const applicationsQuery = useMyApplications(applicationsOnly);
  const detail = detailQuery.data;
  const myApplications = applicationsQuery.data ?? [];
  const canPost = Boolean(currentUser?.onboardedAt);
  const isOwner = detail?.ownerId === currentUser?.id;
  const canApply = Boolean(currentUser?.capabilities.includes("professional") && !isOwner);

  async function refresh(id = listingId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.jobs }),
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.applications }),
      ...(id ? [queryClient.invalidateQueries({ queryKey: marketplaceKeys.jobDetail(id) })] : []),
    ]);
  }

  const createMutation = useMutation({ mutationFn: service.createJob, onSuccess: async (created) => {
    await refresh(created.id); setDialog(null); navigate(`${paths.jobs}/${created.id}`);
  }, onError: () => setError("Could not publish the job. Check your details and try again.") });
  const updateMutation = useMutation({ mutationFn: service.updateJob, onSuccess: async (updated) => {
    await refresh(updated.id); setDialog(null); setError("");
  }, onError: () => setError("Could not update this job.") });
  const applyMutation = useMutation({ mutationFn: service.createJobApplication, onSuccess: async () => {
    await refresh(); setDialog(null); setError("");
  }, onError: (problem: unknown) => setError(problem instanceof Error ? problem.message : "Could not submit your application.") });
  const applicationStatusMutation = useMutation({ mutationFn: service.updateJobApplication, onSuccess: async () => { await refresh(); setError(""); }, onError: () => setError("Could not update the application status.") });

  function submitJobForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minValue = String(form.get("budgetMin") ?? "").trim();
    const maxValue = String(form.get("budgetMax") ?? "").trim();
    const data: Record<string, unknown> = {
      title: String(form.get("title") ?? "").trim(), description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category") ?? "technology"), employmentType: String(form.get("employmentType") ?? "contract"),
      location: String(form.get("location") ?? "").trim() || null, isRemote: form.get("isRemote") === "on",
      budgetMin: minValue ? Number(minValue) : null, budgetMax: maxValue ? Number(maxValue) : null,
      currency: String(form.get("currency") ?? "USD"),
    };
    if (dialog === "edit" && detail) updateMutation.mutate({ id: detail.id, data }); else createMutation.mutate(data);
  }

  function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return;
    const form = new FormData(event.currentTarget);
    const cv = form.get("cv");
    if (!(cv instanceof File) || !cv.size) { setError("Attach your CV as a PDF or DOCX file."); return; }
    applyMutation.mutate({ id: detail.id, coverLetter: String(form.get("coverLetter") ?? "").trim(), cv });
  }

  function submitStatus(application: JobApplication, status: ApplicationStatus) {
    if (!detail) return;
    if (status === "accepted") { setInterviewTarget(application); return; }
    applicationStatusMutation.mutate({ listingId: detail.id, applicationId: application.id, status });
  }
  function submitInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail || !interviewTarget) return;
    const form = new FormData(event.currentTarget); const localDate = String(form.get("scheduledAt") ?? "");
    applicationStatusMutation.mutate({ listingId: detail.id, applicationId: interviewTarget.id, status: "accepted", interview: { scheduledAt: new Date(localDate).toISOString(), durationMinutes: Number(form.get("durationMinutes") ?? 30), mode: String(form.get("mode") ?? "video") as "audio" | "video", notes: String(form.get("notes") ?? "").trim() || undefined } }, { onSuccess: () => setInterviewTarget(null) });
  }
  function changeJobStatus(status: "open" | "closed") {
    if (detail) updateMutation.mutate({ id: detail.id, data: { status } });
  }

  return <main className="min-h-screen bg-page px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-brand">SkillBridge marketplace</p><h1 className="mt-1 text-3xl font-bold text-navy">{applicationsOnly ? "My applications" : "Find your next opportunity"}</h1><p className="mt-2 text-sm text-muted">Explore opportunities and connect with teams looking for your skills.</p></div>{canPost && !applicationsOnly ? <button type="button" onClick={() => setDialog("create")} className={`${actionClass} bg-navy text-white`}><BriefcaseBusiness className="h-4 w-4" />Post a job</button> : null}</header>
    {!applicationsOnly && !listingId ? <div className="mb-5 grid grid-cols-1 items-center gap-3 sm:flex sm:flex-wrap"><label className="relative min-w-0 flex-1 sm:min-w-52"><span className="sr-only">Search jobs</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input aria-label="Search jobs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs and skills" className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm" /></label><select aria-label="Job category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm sm:w-auto"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select><select aria-label="Employment type" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm sm:w-auto"><option value="">All work types</option>{kinds.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select><select aria-label="Work location" value={remote} onChange={(event) => setRemote(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm sm:w-auto"><option value="">Remote or on-site</option><option value="true">Remote</option><option value="false">On-site</option></select><select aria-label="Listing status" value={mine ? "all" : status} onChange={(event) => setStatus(event.target.value)} disabled={mine} className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm sm:w-auto"><option value="open">Open jobs</option><option value="closed">Closed jobs</option><option value="all">All jobs</option></select>{canPost ? <button type="button" onClick={() => setMine((value) => !value)} className={`${actionClass} w-full border border-line sm:w-auto ${mine ? "bg-brand/10 text-brand" : "bg-surface text-ink"}`}>{mine ? "Showing your jobs" : "My job listings"}</button> : null}{currentUser?.capabilities.includes("professional") ? <Link to={paths.jobApplications} className={`${actionClass} w-full border border-line bg-surface text-ink sm:w-auto`}>My applications</Link> : null}</div> : null}
    {error ? <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}<button type="button" onClick={() => setError("")} className="ml-3 underline">Dismiss</button></div> : null}

    {applicationsOnly ? <ApplicationsList rows={myApplications} loading={applicationsQuery.isPending} failed={applicationsQuery.isError} onRetry={() => void applicationsQuery.refetch()} /> : listingId ? <JobDetailPanel detail={detail} loading={detailQuery.isPending} failed={detailQuery.isError} retry={() => void detailQuery.refetch()} isOwner={Boolean(isOwner)} canApply={canApply} onBack={() => navigate(paths.jobs)} onApply={() => setDialog("apply")} onEdit={() => setDialog("edit")} onJobStatus={changeJobStatus} onStatus={submitStatus} onWithdraw={(application) => submitStatus(application, "withdrawn")} busy={applicationStatusMutation.isPending || updateMutation.isPending} /> : <JobsList rows={listingQuery.data ?? []} loading={listingQuery.isPending} failed={listingQuery.isError} retry={() => void listingQuery.refetch()} />}

    {dialog === "create" || dialog === "edit" ? <JobFormDialog mode={dialog} job={detail ?? null} busy={createMutation.isPending || updateMutation.isPending} onClose={() => setDialog(null)} onSubmit={submitJobForm} /> : null}
    {dialog === "apply" ? <ApplicationDialog busy={applyMutation.isPending} onClose={() => setDialog(null)} onSubmit={submitApplication} /> : null}
    {interviewTarget ? <InterviewScheduleDialog application={interviewTarget} busy={applicationStatusMutation.isPending} onClose={() => setInterviewTarget(null)} onSubmit={submitInterview} /> : null}
  </div></main>;
}

function JobsList({ rows, loading, failed, retry }: { rows: JobSummary[]; loading: boolean; failed: boolean; retry: () => void }): ReactElement {
  if (loading) return <Card className="flex items-center justify-center gap-3 py-12"><Spinner size="lg" label="Loading jobs" /><span className="text-sm text-muted">Loading job listings…</span></Card>;
  if (failed) return <ErrorMessage title="Couldn’t load jobs" message="Check your connection and try again." onRetry={retry} />;
  if (!rows.length) return <Card><EmptyState icon={BriefcaseBusiness} title="No jobs found" description="Try another search or category. Check back later for new opportunities." /></Card>;
  return <div className="grid gap-4 md:grid-cols-2">{rows.map((job) => <Link key={job.id} to={`${paths.jobs}/${job.id}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-brand"><Card className="h-full transition-colors hover:border-brand/50"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-navy">{job.title}</h2><p className="mt-1 text-sm text-muted">{person(job.owner)} · {pretty(job.category)}</p></div><span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{pretty(job.status)}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-ink">{job.description}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-muted"><span className="rounded-full bg-page px-2.5 py-1">{pretty(job.employmentType)}</span>{job.isRemote ? <span className="rounded-full bg-page px-2.5 py-1">Remote</span> : null}{job.location ? <span className="inline-flex items-center gap-1 rounded-full bg-page px-2.5 py-1"><MapPin className="h-3 w-3" />{job.location}</span> : null}</div><div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted"><span>{budgetRange(job)}</span><span>{job.applicationCount} {job.applicationCount === 1 ? "application" : "applications"}</span></div></Card></Link>)}</div>;
}

function JobDetailPanel({ detail, loading, failed, retry, isOwner, canApply, onBack, onApply, onEdit, onJobStatus, onStatus, onWithdraw, busy }: { detail?: JobDetail; loading: boolean; failed: boolean; retry: () => void; isOwner: boolean; canApply: boolean; onBack: () => void; onApply: () => void; onEdit: () => void; onJobStatus: (status: "open" | "closed") => void; onStatus: (application: JobApplication, status: ApplicationStatus) => void; onWithdraw: (application: JobApplication) => void; busy: boolean }): ReactElement {
  if (loading) return <Card className="flex items-center justify-center gap-3 py-12"><Spinner size="lg" label="Loading job" /><span className="text-sm text-muted">Loading job details…</span></Card>;
  if (failed || !detail) return <ErrorMessage title="Couldn’t load this job" message="It may have closed or been removed." onRetry={retry} />;
  const application = detail.myApplication;
  return <div className="space-y-5"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft className="h-4 w-4" />Back to jobs</button><Card><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="text-sm font-semibold text-brand">{pretty(detail.category)} · {pretty(detail.employmentType)}</p><h2 className="mt-1 text-2xl font-bold text-navy">{detail.title}</h2><p className="mt-2 text-sm text-muted">Posted by <Link to={profilePath(detail.ownerId)} className="font-semibold text-navy hover:text-brand">{person(detail.owner)}</Link> · {new Date(detail.createdAt).toLocaleDateString()}</p><p className="mt-4 flex flex-wrap gap-3 text-sm text-muted"><span>{detail.isRemote ? "Remote" : detail.location || "On-site"}</span><span>{budgetRange(detail)}</span><span>{pretty(detail.status)}</span></p></div>{isOwner ? <div className="flex gap-2"><button type="button" onClick={onEdit} className={`${actionClass} border border-line bg-surface`}>Edit job</button><button type="button" onClick={() => onJobStatus(detail.status === "open" ? "closed" : "open")} className={`${actionClass} border border-line bg-surface`} disabled={busy}>{detail.status === "open" ? "Close applications" : "Reopen job"}</button></div> : null}</div><div className="mt-6 whitespace-pre-wrap break-words border-t border-line pt-5 text-sm leading-7 text-ink">{detail.description}</div>
    {!isOwner && canApply ? application ? <div className="mt-5 rounded-xl bg-brand/5 p-4"><p className="font-semibold text-navy">Application: {pretty(application.status)}</p>{application.cvFileName ? <a href={`${apiBaseURL}/marketplace/jobs/applications/${encodeURIComponent(application.id)}/cv`} className="mt-2 inline-flex text-sm font-semibold text-brand hover:underline">View your CV · {application.cvFileName}</a> : null}{application.status === "submitted" || application.status === "reviewing" ? <button type="button" onClick={() => onWithdraw(application)} disabled={busy} className="mt-3 block text-sm font-medium text-danger hover:underline">Withdraw application</button> : application.status === "accepted" ? <><Link to={`${paths.messages}?userId=${encodeURIComponent(detail.ownerId)}`} className="mt-3 inline-flex text-sm font-semibold text-brand">Message the client</Link>{application.interview?.status === "scheduled" ? <InterviewDetails interview={application.interview} onJoin={() => void joinInterview(application.interview!)} /> : null}</> : null}</div> : detail.status === "open" ? <button type="button" onClick={onApply} className={`${actionClass} mt-5 bg-brand text-white`}>Apply for this job</button> : null : null}
    </Card>
    {isOwner ? <Card><h3 className="text-lg font-semibold text-navy">Applications ({detail.applications.length})</h3>{detail.applications.length ? <div className="mt-4 space-y-4">{detail.applications.map((item) => <ApplicationCard key={item.id} application={item} onStatus={onStatus} busy={busy} />)}</div> : <p className="mt-2 text-sm text-muted">Applications will appear here.</p>}</Card> : null}</div>;
}

function ApplicationCard({ application, onStatus, busy }: { application: JobApplication; onStatus: (application: JobApplication, status: ApplicationStatus) => void; busy: boolean }): ReactElement {
  return <div className="rounded-xl border border-line p-4"><div className="flex items-start gap-3"><Link to={profilePath(application.applicant.id)} className="rounded-full"><Avatar name={person(application.applicant)} src={application.applicant.profile?.avatarUrl ?? null} size="md" /></Link><div className="min-w-0 flex-1"><Link to={profilePath(application.applicant.id)} className="font-semibold text-navy hover:text-brand">{person(application.applicant)}</Link><p className="text-xs text-muted">{application.applicant.profile?.headline ?? "Professional"} · {new Date(application.createdAt).toLocaleDateString()}</p></div><span className="rounded-full bg-page px-2.5 py-1 text-xs">{pretty(application.status)}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{application.coverLetter}</p><div className="mt-3 flex flex-wrap gap-2">{application.cvFileName ? <a href={`${apiBaseURL}/marketplace/jobs/applications/${encodeURIComponent(application.id)}/cv`} className={`${actionClass} border border-line text-brand`}>Download CV</a> : <span className="text-xs text-muted">No CV attached to this application.</span>}{application.status === "accepted" ? <><Link to={`${paths.messages}?userId=${encodeURIComponent(application.applicant.id)}`} className={`${actionClass} bg-brand/10 text-brand`}>Message applicant</Link>{application.interview?.status === "scheduled" ? <InterviewDetails interview={application.interview} onJoin={() => void joinInterview(application.interview!)} /> : null}</> : application.status === "submitted" || application.status === "reviewing" ? <><button type="button" className={`${actionClass} border border-line ${application.status === "reviewing" ? "bg-success/10 text-success" : ""}`} onClick={() => onStatus(application, "reviewing")} disabled={busy || application.status === "reviewing"}>{application.status === "reviewing" ? "Marked reviewing" : "Mark reviewing"}</button><button type="button" className={`${actionClass} bg-success text-white`} onClick={() => onStatus(application, "accepted")} disabled={busy}>Accept & schedule interview</button><button type="button" className={`${actionClass} text-danger`} onClick={() => onStatus(application, "rejected")} disabled={busy}>Reject</button></> : null}</div></div>;
}

function ApplicationsList({ rows, loading, failed, onRetry }: { rows: JobApplicationSummary[]; loading: boolean; failed: boolean; onRetry: () => void }): ReactElement {
  if (loading) return <Card className="flex justify-center py-10"><Spinner size="lg" label="Loading applications" /></Card>;
  if (failed) return <ErrorMessage title="Couldn’t load your applications" message="Please try again." onRetry={onRetry} />;
  if (!rows.length) return <Card><EmptyState icon={UserRound} title="No applications yet" description="Apply to an open job to track it here." /></Card>;
  return <div className="space-y-3">{rows.map((row) => <Card key={row.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><Link to={`${paths.jobs}/${row.job.id}`} className="font-semibold text-navy hover:text-brand">{row.job.title}</Link><p className="mt-1 text-sm text-muted">{person(row.job.owner)} · {pretty(row.job.category)}</p></div><span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{pretty(row.status)}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-ink">{row.coverLetter}</p>{row.interview?.status === "scheduled" ? <InterviewDetails interview={row.interview} onJoin={() => void joinInterview(row.interview!)} /> : null}<div className="mt-3 flex items-center justify-between"><p className="text-xs text-muted">Updated {new Date(row.updatedAt).toLocaleDateString()}</p>{row.cvFileName ? <a href={`${apiBaseURL}/marketplace/jobs/applications/${encodeURIComponent(row.id)}/cv`} className="text-sm font-semibold text-brand hover:underline">View attached CV</a> : null}</div></Card>)}</div>;
}

function InterviewDetails({ interview, onJoin }: { interview: InterviewSummary; onJoin: () => void }): ReactElement {
  return <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 p-3"><div><p className="text-sm font-semibold text-navy">Interview scheduled · {interview.mode === "video" ? "Video" : "Voice"}</p><p className="mt-1 text-xs text-muted">{new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} minutes</p>{interview.notes ? <p className="mt-1 text-xs text-ink">{interview.notes}</p> : null}</div><button type="button" onClick={onJoin} className={`${actionClass} bg-brand text-white`}>{interview.mode === "video" ? "Join video interview" : "Join voice interview"}</button></div>;
}
async function joinInterview(interview: InterviewSummary) {
  try { const call = await startCall({ kind: "interview", interviewId: interview.id, mode: interview.mode }); window.location.assign(`${paths.calls}/${call.id}`); }
  catch { window.alert("The interview call could not be opened. Please try again."); }
}
function InterviewScheduleDialog({ application, busy, onClose, onSubmit }: { application: JobApplication; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }): ReactElement {
  const [scheduleDefaults] = useState(() => { const now = new Date(); const defaultTime = new Date(now.getTime() + 24 * 60 * 60_000); defaultTime.setMinutes(Math.ceil(defaultTime.getMinutes() / 15) * 15, 0, 0); const local = (value: Date) => new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); return { localValue: local(defaultTime), minValue: local(new Date(now.getTime() + 15 * 60_000)) }; });
  return <Dialog title={`Schedule interview with ${person(application.applicant)}`} onClose={onClose}><form onSubmit={onSubmit} className="space-y-4"><p className="text-sm text-muted">Accepting this application will send the interview details and a private call link to the applicant.</p><Field label="Date and time"><input name="scheduledAt" type="datetime-local" min={scheduleDefaults.minValue} defaultValue={scheduleDefaults.localValue} required className={controlClass} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Call type"><select name="mode" className={controlClass}><option value="video">Video interview</option><option value="audio">Voice interview</option></select></Field><Field label="Duration"><select name="durationMinutes" defaultValue="30" className={controlClass}>{[15, 30, 45, 60, 90, 120, 180].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></Field></div><Field label="Notes for the applicant"><textarea name="notes" maxLength={1000} rows={3} className={controlClass} placeholder="Optional agenda or preparation notes" /></Field><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className={`${actionClass} border border-line`}>Cancel</button><button type="submit" disabled={busy} className={`${actionClass} bg-success text-white`}>{busy ? "Accepting…" : "Accept & schedule"}</button></div></form></Dialog>;
}

function JobFormDialog({ mode, job, busy, onClose, onSubmit }: { mode: "create" | "edit"; job: JobDetail | null; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }): ReactElement {
  return <Dialog title={mode === "create" ? "Post a job" : "Edit job listing"} onClose={onClose}><form onSubmit={onSubmit} className="space-y-3"><Field label="Job title"><input name="title" required minLength={5} maxLength={140} defaultValue={job?.title} className={controlClass} placeholder="e.g. Frontend Engineer" /></Field><Field label="Description"><textarea name="description" required minLength={30} maxLength={8000} rows={5} defaultValue={job?.description} className={controlClass} placeholder="Describe the role, responsibilities, and qualifications." /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><select name="category" defaultValue={job?.category ?? "technology"} className={controlClass}>{categories.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></Field><Field label="Employment type"><select name="employmentType" defaultValue={job?.employmentType ?? "contract"} className={controlClass}>{kinds.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></Field></div><div className="grid gap-3 sm:grid-cols-3"><Field label="Minimum budget"><input name="budgetMin" type="number" min="0.01" step="0.01" defaultValue={job?.budgetMin ?? ""} className={controlClass} /></Field><Field label="Maximum budget"><input name="budgetMax" type="number" min="0.01" step="0.01" defaultValue={job?.budgetMax ?? ""} className={controlClass} /></Field><Field label="Currency"><select name="currency" defaultValue={job?.currency ?? "USD"} className={controlClass}><option>USD</option><option>NGN</option><option>GBP</option><option>EUR</option></select></Field></div><Field label="Location"><input name="location" maxLength={120} defaultValue={job?.location ?? ""} className={controlClass} placeholder="City, country, or leave blank" /></Field><label className="flex items-center gap-2 text-sm"><input name="isRemote" type="checkbox" defaultChecked={job?.isRemote ?? true} />Remote work available</label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2"><button type="button" onClick={onClose} className={`${actionClass} border border-line`}>Cancel</button><button type="submit" disabled={busy} className={`${actionClass} bg-navy text-white`}>{busy ? "Saving…" : mode === "create" ? "Publish job" : "Save changes"}</button></div></form></Dialog>;
}

function ApplicationDialog({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }): ReactElement {
  return <Dialog title="Apply for this job" onClose={onClose}><form onSubmit={onSubmit} className="space-y-4"><Field label="CV or résumé (PDF or DOCX, max 10 MB)"><input name="cv" type="file" required accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className={controlClass} /></Field><Field label="Cover letter"><textarea name="coverLetter" required minLength={30} maxLength={5000} rows={7} className={controlClass} placeholder="Introduce yourself and explain how your experience fits this role." /></Field><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className={`${actionClass} border border-line`}>Cancel</button><button type="submit" disabled={busy} className={`${actionClass} bg-brand text-white`}>{busy ? "Submitting…" : "Submit application"}</button></div></form></Dialog>;
}

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }): ReactElement {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-4 shadow-2xl sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-bold text-navy">{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-full p-2 text-muted hover:bg-page"><X className="h-5 w-5" /></button></div>{children}</section></div>;
}
export function Field({ label, children }: { label: string; children: ReactNode }): ReactElement { return <label className="block text-sm font-medium text-ink">{label}{children}</label>; }
export const controlClass = "mt-1.5 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function person(value: { profile: { displayName: string; headline?: string | null } | null }): string { return value.profile?.displayName ?? "SkillBridge member"; }
function budgetRange(job: Pick<JobSummary, "budgetMin" | "budgetMax" | "currency">): string { if (job.budgetMin == null && job.budgetMax == null) return "Budget discussed"; const format = (value: number | null) => value == null ? null : new Intl.NumberFormat(undefined, { style: "currency", currency: job.currency, maximumFractionDigits: 0 }).format(value); return [format(job.budgetMin), format(job.budgetMax)].filter(Boolean).join(" – "); }
