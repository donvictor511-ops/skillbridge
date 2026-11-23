import { useState } from "react";
import { Flag } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postKeys } from "./postsQueries";
import { reportPostContent } from "./postsService";

const reasons = ["spam", "harassment", "inappropriate_content", "misinformation", "other"] as const;

export function ContentReportButton({ postId, commentId }: { postId: string; commentId?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]>("other");
  const [details, setDetails] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: () => reportPostContent({ postId, commentId, reason, details }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: postKeys.feed() }); setOpen(false); } });
  if (mutation.isSuccess) return <span role="status" className="text-xs text-emerald-700">Report submitted</span>;
  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Flag className="h-3.5 w-3.5" />Report</button>
    {open ? <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="absolute right-0 top-8 z-30 w-72 space-y-2 rounded-xl border border-line bg-surface p-3 shadow-xl">
      <label className="block text-xs font-semibold text-ink">Reason<select value={reason} onChange={(event) => setReason(event.target.value as (typeof reasons)[number])} className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm">{reasons.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
      <label className="block text-xs font-semibold text-ink">Details (optional)<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full resize-y rounded-lg border border-line bg-surface p-2 text-sm" /></label>
      {mutation.isError ? <p role="alert" className="text-xs text-danger-strong">Could not submit the report. Please try again.</p> : null}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-page">Cancel</button><button type="submit" disabled={mutation.isPending} className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{mutation.isPending ? "Sending…" : "Send report"}</button></div>
    </form> : null}
  </div>;
}
