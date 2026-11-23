import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link, useSearchParams } from "react-router";
import { BriefcaseBusiness, FolderKanban, Search, Users, UsersRound, MessageSquareText, LoaderCircle } from "lucide-react";
import { Avatar, Card, EmptyState } from "../../components/ui";
import { useGlobalSearch } from "./searchQueries";
import type { GlobalSearchItem } from "./searchService";

type Filter = "all" | "people" | "posts" | "communities" | "jobs" | "projects";
const groups: Array<{ key: Exclude<Filter, "all">; title: string; icon: typeof Users }> = [
  { key: "people", title: "People", icon: Users },
  { key: "posts", title: "Posts and discussions", icon: MessageSquareText },
  { key: "communities", title: "Communities", icon: UsersRound },
  { key: "jobs", title: "Jobs", icon: BriefcaseBusiness },
  { key: "projects", title: "Projects", icon: FolderKanban },
];

export function SearchPage(): ReactElement {
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(query);
  const [filter, setFilter] = useState<Filter>("all");
  const results = useGlobalSearch(query);
  useEffect(() => { document.title = query ? `Search: ${query} | SkillBridge` : "Search | SkillBridge"; }, [query]);
  useEffect(() => setDraft(query), [query]);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (draft.trim().length >= 2) { setFilter("all"); setParams({ q: draft.trim() }); } }

  const groupData = results.data?.groups;
  const visibleGroups = filter === "all" ? groups : groups.filter((group) => group.key === filter);
  const visibleCount = groupData ? visibleGroups.reduce((count, group) => count + groupData[group.key].length, 0) : 0;
  const total = groupData ? Object.values(groupData).reduce((count, items) => count + items.length, 0) : 0;

  return <main className="min-h-screen bg-page px-4 py-8 sm:px-6"><div className="mx-auto max-w-4xl space-y-5">
    <header><p className="text-sm font-semibold text-brand">Search SkillBridge</p><h1 className="mt-1 text-2xl font-bold text-navy sm:text-3xl">Find people and opportunities</h1></header>
    <form onSubmit={submit} role="search" className="flex gap-2"><label className="relative flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"><Search className="h-5 w-5 shrink-0 text-muted" /><span className="sr-only">Search all of SkillBridge</span><input autoFocus type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="People, posts, skills, groups, jobs, projects…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" /></label><button disabled={draft.trim().length < 2} type="submit" className="rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">Search</button></form>
    {!query ? <Card><EmptyState icon={Search} title="What are you looking for?" description="Search across public profiles, posts, communities, open jobs, and projects." /></Card> : null}
    {query && results.isPending ? <Card className="flex items-center justify-center gap-3 py-12 text-sm text-muted"><LoaderCircle className="h-5 w-5 animate-spin" />Searching SkillBridge…</Card> : null}
    {query && results.isError ? <Card role="alert" className="text-sm text-danger-strong">Search is unavailable right now. Please try again.</Card> : null}
    {groupData ? <>
      <div className="flex gap-2 overflow-x-auto pb-1">{(["all", ...groups.map((group) => group.key)] as Filter[]).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === item ? "bg-navy text-white" : "bg-surface text-muted hover:bg-brand/10 hover:text-navy"}`}>{item === "all" ? `All (${total})` : `${item} (${groupData[item].length})`}</button>)}</div>
      {!visibleCount ? <Card><EmptyState icon={Search} title={filter === "all" ? "No results found" : `No ${filter} found`} description={`Try different words or a skill related to “${query}”.`} /></Card> : <div className="space-y-4">{visibleGroups.map((group) => {
        const rows = groupData[group.key];
        if (!rows.length) return null;
        const Icon = group.icon;
        return <Card key={group.key} className="p-0"><div className="flex items-center gap-2 border-b border-line px-5 py-4"><Icon className="h-4 w-4 text-brand" /><h2 className="font-semibold text-navy">{group.title}</h2><span className="text-xs text-muted">{rows.length}</span></div><div className="divide-y divide-line">{rows.map((item) => <SearchResultRow key={`${item.type}-${item.id}`} item={item} />)}</div></Card>;
      })}</div>}
    </> : null}
  </div></main>;
}

function SearchResultRow({ item }: { item: GlobalSearchItem }): ReactElement {
  return <Link to={item.href} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-page"><Avatar name={item.title} src={item.imageUrl} size="md" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.title}</span>{item.meta ? <span className="mt-0.5 block text-xs text-brand">{item.meta}</span> : null}<span className="mt-1 line-clamp-2 block text-sm leading-5 text-muted">{item.description}</span></span></Link>;
}
