import type { ReactElement } from "react";
import { ArrowDown, LoaderCircle } from "lucide-react";

export function LoadMoreButton({ label, loaded, total, loading, onClick }: { label: string; loaded: number; total: number; loading: boolean; onClick: () => void }): ReactElement {
  return <div className="mt-6 flex flex-col items-center gap-2 border-t border-line pt-5">
    <button type="button" onClick={onClick} disabled={loading} aria-live="polite" className="inline-flex min-w-48 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-brand/40 hover:bg-brand/5 disabled:cursor-wait disabled:opacity-70">
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />}
      {loading ? `Loading ${label}…` : `Show more ${label}`}
    </button>
    <p role="status" className="text-xs text-muted">Showing {loaded.toLocaleString()} of {total.toLocaleString()} {label}</p>
  </div>;
}
