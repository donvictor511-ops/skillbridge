import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useLocation } from "react-router";
import { LoaderCircle } from "lucide-react";

interface PendingNavigation { origin: string; destination: string; startedAt: number; }

export function NavigationProgress(): ReactElement | null {
  const location = useLocation();
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const timer = useRef<number | null>(null);
  const currentLocation = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    function handleInternalLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      let url: URL;
      try { url = new URL(link.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      const destination = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (destination === current) return;
      if (timer.current !== null) window.clearTimeout(timer.current);
      setPending({ origin: current, destination, startedAt: Date.now() });
      timer.current = window.setTimeout(() => { setPending(null); timer.current = null; }, 12_000);
    }
    document.addEventListener("click", handleInternalLink, true);
    return () => { document.removeEventListener("click", handleInternalLink, true); if (timer.current !== null) window.clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!pending || currentLocation === pending.origin) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    const elapsed = Date.now() - pending.startedAt;
    timer.current = window.setTimeout(() => { setPending(null); timer.current = null; }, Math.max(0, 700 - elapsed));
    return () => { if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [currentLocation, pending]);

  if (!pending) return null;
  return <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[3.75rem] z-[60]">
    <div className="h-0.5 w-full overflow-hidden bg-brand/10"><div className="navigation-progress-fill h-full rounded-full bg-brand" /></div>
    <div className="absolute right-3 top-2 inline-flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-1.5 text-xs font-medium text-ink shadow-card"><LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand" />Opening page…</div>
  </div>;
}
