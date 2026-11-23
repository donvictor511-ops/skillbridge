import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, ErrorMessage } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { submitAccountAppeal } from "../../services/authService";
import type { Credentials } from "../../types/auth";

export function AccountAppealForm({ defaultEmail = "", credentials }: { defaultEmail?: string; credentials?: Credentials }): ReactElement {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const appeal = useMutation({ mutationFn: submitAccountAppeal });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    appeal.mutate({ email: credentials?.email ?? email, password: credentials?.password ?? password, message });
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 rounded-xl border border-line bg-page p-4">
      <div>
        <h2 className="font-semibold text-navy">Appeal this account action</h2>
        <p className="mt-1 text-sm text-muted">Explain why you believe the restriction or suspension should be reviewed. An administrator will see your message.</p>
      </div>
      {!credentials ? <>
        <label className="block text-sm font-medium text-ink">Account email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3" /></label>
        <label className="block text-sm font-medium text-ink">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3" /></label>
      </> : <p className="text-xs text-muted">Your sign-in details will be securely checked to confirm this is your account.</p>}
      <label className="block text-sm font-medium text-ink">Your appeal<textarea required minLength={20} maxLength={2000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what happened and why you think the decision should be reconsidered." className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" /></label>
      {appeal.isError ? <ErrorMessage title="Could not submit appeal" message={getApiErrorInfo(appeal.error).message} /> : null}
      {appeal.isSuccess ? <p role="status" className="text-sm font-medium text-success-strong">Appeal submitted. It is now waiting for administrator review.</p> : null}
      <Button type="submit" loading={appeal.isPending} disabled={appeal.isSuccess || message.trim().length < 20}>{appeal.isPending ? "Submitting appeal…" : appeal.isSuccess ? "Appeal submitted" : "Submit appeal"}</Button>
    </form>
  );
}
