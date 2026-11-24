import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link } from "react-router";
import { paths } from "../../app/paths";
import { Button, ErrorMessage, Input } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { forgotPasswordFormSchema } from "./authSchemas";
import { requestPasswordReset } from "../../services/authService";

export function ForgotPasswordForm(): ReactElement {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const result = forgotPasswordFormSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Enter your email address.");
      return;
    }

    setIsSending(true);
    try {
      await requestPasswordReset(result.data.email);
      setIsSent(true);
    } catch (requestError: unknown) {
      setError(getApiErrorInfo(requestError).message);
    } finally {
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
      <div className="space-y-5">
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          If an account exists for <strong>{email}</strong>, reset instructions are on the way. Check your inbox and spam folder.
        </div>
        <Link to={paths.login} className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-page">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error ? <ErrorMessage title="Could not send reset instructions" message={error} /> : null}
      <Input
        id="forgot-email"
        name="email"
        type="email"
        label="Email address"
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button type="submit" fullWidth loading={isSending}>
        {isSending ? "Sending instructions..." : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted">
        Remember your password? <Link to={paths.login} className="font-semibold text-brand hover:underline">Log in</Link>
      </p>
    </form>
  );
}
