import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { apiClient } from "../services/apiClient";
import type { ApiSuccessResponse } from "../types/api";
import { Card, ErrorMessage, Spinner } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface Guideline { id: string; title: string; description: string }

export function CommunityGuidelinesPage(): ReactElement {
  useDocumentTitle("Community guidelines | SkillBridge");
  const query = useQuery({
    queryKey: ["moderation", "guidelines"],
    queryFn: async () => (await apiClient.get<ApiSuccessResponse<{ rules: Guideline[] }>>("/moderation/guidelines")).data.data.rules,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return <main className="min-h-screen bg-page px-4 py-10 sm:px-6"><div className="mx-auto max-w-4xl">
    <header className="mb-7"><p className="flex items-center gap-2 text-sm font-semibold text-brand"><ShieldCheck className="h-4 w-4" />A practical standard for everyone</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">SkillBridge community guidelines</h1><p className="mt-3 max-w-3xl text-muted">These rules keep SkillBridge useful, respectful, and safe for people building their careers and professional networks.</p></header>
    {query.isPending ? <Card className="flex justify-center py-12"><Spinner label="Loading community guidelines" /></Card> : null}
    {query.isError ? <ErrorMessage title="Guidelines are temporarily unavailable" message="Please try again in a moment." onRetry={() => void query.refetch()} /> : null}
    {query.data ? <div className="space-y-3">{query.data.map((rule, index) => <Card key={rule.id} className="flex gap-4 p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 font-bold text-brand">{index + 1}</span><div><h2 className="font-semibold text-navy">{rule.title}</h2><p className="mt-1 text-sm leading-6 text-muted">{rule.description}</p></div></Card>)}<Card className="border-brand/20 bg-brand/5 p-5"><h2 className="font-semibold text-navy">Context matters</h2><p className="mt-1 text-sm leading-6 text-muted">Respectful disagreement, criticism of work or organizations, and educational discussion of difficult topics are allowed. A topic or opinion alone is not a violation. Reports are reviewed in context, and people can appeal account restrictions.</p></Card></div> : null}
  </div></main>;
}
