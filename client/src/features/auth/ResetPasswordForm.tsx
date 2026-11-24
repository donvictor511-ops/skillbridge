import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link, useSearchParams } from "react-router";
import { paths } from "../../app/paths";
import { Button, ErrorMessage } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { completePasswordReset } from "../../services/authService";
import { PASSWORD_MIN_LENGTH, resetPasswordFormSchema } from "./authSchemas";
import { PasswordField } from "./PasswordField";
import { suggestStrongPassword } from "./passwordGenerator";

export function ResetPasswordForm(): ReactElement {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [passwordSuggested, setPasswordSuggested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (token) {
      // Keep the one-time bearer token out of the browser's address bar/history.
      window.history.replaceState({}, "", paths.resetPassword);
    }
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const result = resetPasswordFormSchema.safeParse({ password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Choose a new password.");
      return;
    }

    setIsSaving(true);
    try {
      await completePasswordReset({ token, password: result.data.password });
      setIsComplete(true);
    } catch (requestError: unknown) {
      setError(getApiErrorInfo(requestError).message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isComplete) {
    return (
      <div className="space-y-5">
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          Your password has been updated. For your security, you have been signed out of other sessions.
        </div>
        <Link to={paths.login} className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
          Continue to log in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-5">
        <ErrorMessage title="Reset link is missing" message="Open the full link from your email, or request a new password reset link." />
        <Link to={paths.forgotPassword} className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error ? <ErrorMessage title="Could not update your password" message={error} /> : null}
      <PasswordField
        id="reset-password"
        name="password"
        label="New password"
        autoComplete="new-password"
        required
        hint={`Use at least ${PASSWORD_MIN_LENGTH} characters.`}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setPasswordSuggested(false);
        }}
      />
      <div className="-mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setPassword(suggestStrongPassword());
            setPasswordSuggested(true);
          }}
          className="rounded-control text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Suggest a strong password
        </button>
        <span aria-live="polite" className="text-xs text-muted">
          {passwordSuggested
            ? "Suggested password filled. Use the eye icon to view or copy it."
            : "Your browser can save it for you"}
        </span>
      </div>
      <Button type="submit" fullWidth loading={isSaving}>
        {isSaving ? "Updating password..." : "Save new password"}
      </Button>
    </form>
  );
}
