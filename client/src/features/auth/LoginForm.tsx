import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Button, ErrorMessage, Input } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { focusFirstInvalidField } from "../../lib/forms";
import { useLogin } from "./authQueries";
import { AccountAppealForm } from "./AccountAppealForm";
import { loginFormSchema, toFieldErrors } from "./authSchemas";
import { PasswordField } from "./PasswordField";

type FieldErrors = Record<string, string>;

const FIELD_ORDER = ["email", "password"] as const;

export function LoginForm(): ReactElement {
  const loginMutation = useLogin();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [suspendedLogin, setSuspendedLogin] = useState<{ email: string; password: string } | null>(null);

  // When the user edits a field, its old error no longer applies.
  function clearFieldError(field: string): void {
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);
    setSuspendedLogin(null);

    // 1. Quick checks in the browser (feedback only).
    const result = loginFormSchema.safeParse({ email, password });

    if (!result.success) {
      const errors = toFieldErrors(result.error);
      setFieldErrors(errors);
      focusFirstInvalidField(errors, FIELD_ORDER, "login");
      return;
    }

    setFieldErrors({});

    // 2. Ask the server. On success, the cached user changes and
    //    GuestRoute sends the person to the right page.
    loginMutation.mutate(result.data, {
      onError: (error: unknown) => {
        const info = getApiErrorInfo(error);
        if (info.code === "ACCOUNT_SUSPENDED") setSuspendedLogin(result.data);
        const hasFieldErrors = Object.keys(info.fieldErrors).length > 0;

        setFieldErrors(info.fieldErrors);
        setFormError(hasFieldErrors ? null : info.message);
        focusFirstInvalidField(info.fieldErrors, FIELD_ORDER, "login");
      },
    });
  }

  return (
    <>
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <ErrorMessage title="Could not log in" message={formError} />
      ) : null}

      <Input
        id="login-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          clearFieldError("email");
          setSuspendedLogin(null);
        }}
        error={fieldErrors.email}
      />

      <PasswordField
        id="login-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          clearFieldError("password");
          setSuspendedLogin(null);
        }}
        error={fieldErrors.password}
      />

      <Button type="submit" fullWidth loading={loginMutation.isPending}>
        {loginMutation.isPending ? "Logging in..." : "Log in"}
      </Button>
    </form>
    {suspendedLogin ? <AccountAppealForm key={suspendedLogin.email} credentials={suspendedLogin} /> : null}
    </>
  );
}
