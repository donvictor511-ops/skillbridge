import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BriefcaseBusiness, FileText, Lightbulb, MessageSquareText, Sparkles, UserRoundSearch, WandSparkles } from "lucide-react";
import { Link } from "react-router";
import { paths, profilePath } from "../../app/paths";
import { Badge, Button, Card, Select, Textarea } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { getAiStatus, requestAiAssistance } from "./aiService";
import type { AiAssistInput, AiAssistResult, AiTask } from "./aiService";

const tasks: Array<{ id: AiTask; label: string; description: string; icon: typeof Sparkles }> = [
  { id: "profile_improvement", label: "Improve my profile", description: "Get a clearer headline, About section, and specific profile improvements.", icon: WandSparkles },
  { id: "cv_assistance", label: "CV / résumé help", description: "Review your CV, strengthen wording, and tailor it to a role.", icon: FileText },
  { id: "job_recommendations", label: "Find relevant jobs", description: "Match your profile to open opportunities on SkillBridge.", icon: BriefcaseBusiness },
  { id: "project_recommendations", label: "Find projects", description: "Find open projects that fit your experience and skills.", icon: Lightbulb },
  { id: "writing_assistance", label: "Write or improve text", description: "Draft a professional post or project proposal in your voice.", icon: MessageSquareText },
  { id: "skill_recommendations", label: "Explore skills to build", description: "See useful skills to learn or highlight based on your experience.", icon: Sparkles },
  { id: "professional_matching", label: "Find professionals", description: "Get networking matches with shared skills or mutual connections.", icon: UserRoundSearch },
];

function resultPath(task: AiTask, id: string): string {
  if (task === "job_recommendations") return `${paths.jobs}/${encodeURIComponent(id)}`;
  if (task === "project_recommendations") return `${paths.projects}/${encodeURIComponent(id)}`;
  return profilePath(id);
}

export function AiCareerPage(): ReactElement {
  useDocumentTitle("AI Career Studio | SkillBridge");
  const [task, setTask] = useState<AiTask>("profile_improvement");
  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState("");
  const [writingType, setWritingType] = useState<"post" | "proposal">("post");
  const selectedTask = tasks.find((item) => item.id === task) ?? tasks[0];
  const statusQuery = useQuery({ queryKey: ["ai", "status"], queryFn: getAiStatus, staleTime: 60_000, retry: false });
  const aiConfigured = statusQuery.data?.configured === true;
  const mutation = useMutation<AiAssistResult, unknown, AiAssistInput>({ mutationFn: requestAiAssistance });

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const input: AiAssistInput = { task };
    if ((task === "cv_assistance" || task === "writing_assistance") && draft.trim()) input.draft = draft.trim();
    if (["profile_improvement", "cv_assistance", "writing_assistance", "skill_recommendations"].includes(task) && target.trim()) input.target = target.trim();
    if (task === "writing_assistance") input.writingType = writingType;
    mutation.mutate(input);
  }

  const requiresCv = task === "cv_assistance";
  const needsWritingContext = task === "writing_assistance";
  const error = mutation.isError ? getApiErrorInfo(mutation.error).message : null;

  return (
    <main className="min-h-screen bg-page px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
        <div className="space-y-6">
          <header>
            <Badge tone="brand"><Sparkles className="mr-1.5 h-3.5 w-3.5" />SkillBridge AI</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy">AI Career Studio</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Practical help for presenting your skills, finding opportunities, and growing your professional network.</p>
          </header>

          {statusQuery.data?.configured === false ? <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink"><p className="font-semibold">Gemini setup is needed</p><p className="mt-1 text-muted">Create a free Gemini API key in Google AI Studio, add <code className="rounded bg-page px-1.5 py-0.5">GEMINI_API_KEY</code> to <code className="rounded bg-page px-1.5 py-0.5">server/.env</code>, then restart the API. SkillBridge defaults to the free-tier Gemini 3.5 Flash-Lite model.</p></div> : null}

          <Card>
            <form onSubmit={submit} className="space-y-5">
              <Select label="What would you like help with?" value={task} onChange={(event) => { setTask(event.target.value as AiTask); setDraft(""); setTarget(""); mutation.reset(); }}>
                {tasks.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </Select>
              <p className="-mt-3 text-sm text-muted">{selectedTask.description}</p>

              {task === "writing_assistance" ? <Select label="Writing type" value={writingType} onChange={(event) => setWritingType(event.target.value as "post" | "proposal")}><option value="post">Professional post</option><option value="proposal">Project proposal</option></Select> : null}

              {requiresCv ? <Textarea label="Paste your CV / résumé text" required minLength={40} maxLength={6000} rows={12} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Paste the text from your CV here. Remove personal contact details if you don't want to share them with the configured AI provider." hint="PDF and Word files are not uploaded here; paste the text you want reviewed." /> : null}

              {needsWritingContext ? <Textarea label="Your draft or the message you want to express" maxLength={6000} rows={7} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Paste a draft, or describe what you want your post or proposal to say." /> : null}

              {task === "profile_improvement" || task === "cv_assistance" || task === "writing_assistance" || task === "skill_recommendations" ? <Textarea label={task === "cv_assistance" ? "Target role (optional)" : task === "writing_assistance" ? "Audience or goal (optional)" : "Career goal or target role (optional)"} rows={2} maxLength={1400} value={target} onChange={(event) => setTarget(event.target.value)} placeholder={task === "writing_assistance" ? "Who is this for, and what do you want them to do?" : "e.g. Frontend developer, product designer, project manager"} /> : null}

              <Button type="submit" loading={mutation.isPending} disabled={!aiConfigured || mutation.isPending || (requiresCv && draft.trim().length < 40) || (needsWritingContext && !draft.trim() && !target.trim())} className="gap-2"><Sparkles className="h-4 w-4" />{mutation.isPending ? "Thinking…" : aiConfigured ? "Get AI assistance" : "AI setup required"}</Button>
            </form>
          </Card>

          <div className="rounded-xl border border-line bg-surface/70 p-4 text-xs leading-5 text-muted">
            When you submit, the text you enter and relevant profile details are sent to Google Gemini for this request. Google’s Gemini API free tier may use submitted content to improve its products. Remove contact details you don’t want to share. Review suggestions before use; nothing is published or saved automatically.
          </div>
        </div>

        <aside aria-live="polite" aria-busy={mutation.isPending} className="space-y-4">
          <h2 className="text-lg font-semibold text-navy">Your assistance</h2>
          {mutation.isPending ? <Card className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><Sparkles className="h-7 w-7 animate-pulse text-brand" /><p className="font-medium text-ink">Preparing thoughtful suggestions…</p><p className="text-sm text-muted">This can take a few seconds.</p></Card>
            : error ? <Card role="alert" className="border-danger/30"><h3 className="font-semibold text-danger">Couldn’t complete that request</h3><p className="mt-2 text-sm text-muted">{error}</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => mutation.reset()}>Dismiss</Button></Card>
              : mutation.data ? <Card><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand" /><h3 className="font-semibold text-navy">{selectedTask.label}</h3></div>{mutation.data.text ? <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{mutation.data.text}</p> : null}{mutation.data.summary ? <p className="mt-3 text-sm leading-6 text-ink">{mutation.data.summary}</p> : null}{mutation.data.recommendations?.length ? <div className="mt-4 space-y-3">{mutation.data.recommendations.map((item) => <div key={item.id} className="rounded-xl border border-line p-3"><Link to={resultPath(task, item.id)} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">{item.label}<ArrowUpRight className="h-3.5 w-3.5" /></Link><p className="mt-1 text-sm leading-5 text-muted">{item.reason}</p></div>)}</div> : null}<p className="mt-5 border-t border-line pt-3 text-xs text-muted">AI suggestions can be incomplete. Please check details before acting on them.</p></Card>
                : <Card className="flex min-h-48 flex-col items-center justify-center text-center"><Sparkles className="h-7 w-7 text-brand" /><p className="mt-3 font-medium text-navy">Choose a task to begin</p><p className="mt-1 max-w-xs text-sm text-muted">Your results will appear here, ready for you to review and use.</p></Card>}
        </aside>
      </div>
    </main>
  );
}
