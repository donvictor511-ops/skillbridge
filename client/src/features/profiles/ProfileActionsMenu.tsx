import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Ban, Check, Copy, Flag, MoreHorizontal, MessageCircle, UserRound, X } from "lucide-react";
import { paths, profilePath } from "../../app/paths";
import { useCurrentUser } from "../auth/authQueries";
import { blockProfileUser, reportProfileUser } from "../../services/profileService";
import { profileKeys } from "./profileQueries";

interface ProfileActionsMenuProps {
  userId: string;
  displayName: string;
  joinedAt: string;
}

const reportReasons = [
  ["spam", "Spam or scam"],
  ["harassment", "Harassment or bullying"],
  ["inappropriate_content", "Inappropriate content"],
  ["impersonation", "Impersonation"],
  ["other", "Something else"],
] as const;

export function ProfileActionsMenu({ userId, displayName, joinedAt }: ProfileActionsMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const blockMutation = useMutation({
    mutationFn: () => blockProfileUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
      navigate(paths.discover, { replace: true });
    },
    onError: () => setError("We couldn’t block this user. Please try again."),
  });
  const reportMutation = useMutation({
    mutationFn: (input: { reason: string; details?: string }) => reportProfileUser(userId, input),
    onSuccess: () => { setReportOpen(false); setError(""); setNotice("Your report was submitted."); },
    onError: () => setError("We couldn’t submit your report. Please try again."),
  });
  const isOwner = currentUser?.id === userId;
  const canContact = Boolean(currentUser && currentUser.onboardedAt && !isOwner);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(profilePath(userId), window.location.origin).toString());
      setCopied(true);
      setNotice("");
      window.setTimeout(() => setCopied(false), 1800);
      setError("");
    } catch {
      setError("Couldn’t copy the profile link. Please copy it from your browser address bar.");
    }
  }

  function openReport() {
    setOpen(false);
    setError("");
    setReportOpen(true);
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reason = String(formData.get("reason") ?? "other");
    const details = String(formData.get("details") ?? "").trim();
    reportMutation.mutate({ reason, ...(details ? { details } : {}) });
  }

  return (
    <div className="absolute right-0 top-0 z-20">
      <button type="button" aria-label={`More actions for ${displayName}`} aria-haspopup="menu" aria-expanded={open}
        onClick={() => { setOpen((value) => !value); setError(""); }}
        className="rounded-full border border-line bg-surface p-2 text-muted shadow-sm hover:bg-page hover:text-navy focus-visible:outline-2 focus-visible:outline-brand">
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close profile actions" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
            <button role="menuitem" type="button" onClick={() => void copyLink()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-page">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}{copied ? "Profile link copied" : "Copy profile link"}
            </button>
            {canContact ? <button role="menuitem" type="button" onClick={() => navigate(`${paths.messages}?userId=${encodeURIComponent(userId)}&shareProfile=1`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-page"><MessageCircle className="h-4 w-4" />Send profile in a message</button> : null}
            <div className="my-1 border-t border-line" />
            <div className="flex items-start gap-3 px-3 py-2.5 text-sm text-muted"><UserRound className="mt-0.5 h-4 w-4 shrink-0" /><span>Joined {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(joinedAt))}</span></div>
            {canContact ? <>
              <div className="my-1 border-t border-line" />
              <button role="menuitem" type="button" onClick={() => { setOpen(false); if (window.confirm(`Block ${displayName}? They won’t be able to view your profile, message you, or connect with you.`)) blockMutation.mutate(); }} disabled={blockMutation.isPending} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-danger hover:bg-danger/5 disabled:opacity-50"><Ban className="h-4 w-4" />{blockMutation.isPending ? "Blocking…" : "Block user"}</button>
              <button role="menuitem" type="button" onClick={openReport} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-page"><Flag className="h-4 w-4" />Report profile</button>
            </> : null}
          </div>
        </>
      ) : null}
      {error ? <div role="alert" className="absolute right-0 top-12 z-30 w-72 rounded-lg border border-danger/30 bg-surface p-3 text-xs text-danger shadow-lg">{error}</div> : null}
      {notice ? <div role="status" className="absolute right-0 top-12 z-30 w-64 rounded-lg border border-success/30 bg-surface p-3 text-xs text-success shadow-lg">{notice}</div> : null}
      {reportOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReportOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="report-profile-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 id="report-profile-title" className="text-lg font-semibold text-navy">Report profile</h2><p className="mt-1 text-sm text-muted">Tell us what’s wrong with {displayName}’s profile.</p></div><button type="button" onClick={() => setReportOpen(false)} aria-label="Close report" className="rounded-full p-1 text-muted hover:bg-page"><X className="h-5 w-5" /></button></div>
            <form onSubmit={submitReport} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-ink">Reason<select name="reason" className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" defaultValue="spam">{reportReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-sm font-medium text-ink">Additional details <span className="font-normal text-muted">(optional)</span><textarea name="details" rows={4} maxLength={1000} className="mt-1.5 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 font-normal" placeholder="Add any details that can help us review this report." /></label>
              {reportMutation.isSuccess ? <p className="text-sm text-success" role="status">Thanks. Your report was submitted.</p> : null}
              {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setReportOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-page">Cancel</button><button type="submit" disabled={reportMutation.isPending} className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50">{reportMutation.isPending ? "Submitting…" : "Submit report"}</button></div>
            </form>
          </section>
        </div>, document.body) : null}
    </div>
  );
}
