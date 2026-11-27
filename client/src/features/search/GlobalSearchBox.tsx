import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useGlobalSearch } from "./searchQueries";
import type { GlobalSearchItem } from "./searchService";

export function GlobalSearchBox({ compact = false }: { compact?: boolean }): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [openRoute, setOpenRoute] = useState<string | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const isOpen = openRoute === routeKey;
  const isExpanded = expandedRoute === routeKey;
  const setIsOpen = useCallback((open: boolean) => setOpenRoute(open ? routeKey : null), [routeKey]);
  const setIsExpanded = useCallback((expanded: boolean) => setExpandedRoute(expanded ? routeKey : null), [routeKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsOpen(false); setIsExpanded(false); inputRef.current?.blur(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [isOpen, setIsExpanded, setIsOpen]);

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [isExpanded]);

  const query = useGlobalSearch(debounced, isOpen);
  const suggestions = useMemo(() => {
    if (!query.data) return [];
    const { people, posts, communities, jobs, projects } = query.data.groups;
    return [...people, ...posts, ...communities, ...jobs, ...projects].slice(0, 8);
  }, [query.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    if (q.length < 2) return;
    setIsOpen(false);
    setIsExpanded(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }
  function seeAllResults() {
    const q = value.trim();
    if (q.length < 2) return;
    setIsOpen(false);
    setIsExpanded(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  const input = <form onSubmit={submit} role="search" className="relative flex h-10 items-center gap-2 rounded-xl border border-line bg-page px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
    {query.isFetching ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden="true" /> : <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
    <input ref={inputRef} type="search" value={value} onFocus={() => setIsOpen(true)} onChange={(event) => { setValue(event.target.value); setIsOpen(true); }} placeholder="Search SkillBridge" aria-label="Search all of SkillBridge" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
    {value ? <button type="button" onClick={() => { setValue(""); setDebounced(""); inputRef.current?.focus(); }} aria-label="Clear search" className="rounded-full p-1 text-muted hover:bg-surface hover:text-ink"><X className="h-3.5 w-3.5" /></button> : null}
  </form>;

  return <div ref={rootRef} className={cn("relative", compact ? "md:hidden" : "hidden min-w-36 flex-1 md:block xl:max-w-sm")}>
    {compact ? <button type="button" aria-label={isExpanded ? "Close search" : "Open global search"} onClick={() => { const open = !isExpanded; setIsExpanded(open); setIsOpen(open); }} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy hover:bg-page"><Search className="h-5 w-5" /></button> : null}
    {compact ? isExpanded ? <div className="absolute right-0 top-12 z-50 w-[min(90vw,24rem)] rounded-2xl border border-line bg-surface p-3 shadow-card">{input}</div> : null : input}
    {isOpen && !compact && debounced.length >= 2 ? <SuggestionPanel query={query} suggestions={suggestions} onChoose={() => setIsOpen(false)} onSearch={seeAllResults} compact={false} /> : null}
    {isOpen && compact && isExpanded && debounced.length >= 2 ? <SuggestionPanel query={query} suggestions={suggestions} onChoose={() => { setIsOpen(false); setIsExpanded(false); }} onSearch={seeAllResults} compact /> : null}
  </div>;
}

function SuggestionPanel({ query, suggestions, onChoose, onSearch, compact }: { query: ReturnType<typeof useGlobalSearch>; suggestions: GlobalSearchItem[]; onChoose: () => void; onSearch: () => void; compact: boolean }): ReactElement {
  return <div className={cn("absolute top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-card", compact ? "right-0 w-[min(90vw,24rem)]" : "left-0 right-0")}>
    {query.isPending || query.isFetching ? <p className="px-3 py-4 text-sm text-muted">Searching SkillBridge…</p> : query.isError ? <p className="px-3 py-4 text-sm text-muted">Search is temporarily unavailable.</p> : suggestions.length ? <div className="max-h-[min(60vh,28rem)] overflow-y-auto">{suggestions.map((item) => <Link key={`${item.type}-${item.id}`} to={item.href} onClick={onChoose} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-page"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold uppercase text-brand">{item.title.slice(0, 1)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{item.title}</span><span className="block truncate text-xs text-muted">{item.meta ?? item.description}</span></span></Link>)}</div> : <p className="px-3 py-4 text-sm text-muted">No results found.</p>}
    <button type="button" onClick={onSearch} className="mt-1 flex w-full items-center gap-2 border-t border-line px-3 py-3 text-left text-sm font-semibold text-brand hover:bg-page"><Search className="h-4 w-4" />See all results for “{query.data?.query ?? "your search"}”</button>
  </div>;
}
