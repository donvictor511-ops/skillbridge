import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Button, ErrorMessage, Input } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { focusFirstInvalidField } from "../../lib/forms";
import { useRegister } from "./authQueries";
import {
  PASSWORD_MIN_LENGTH,
  registerFormSchema,
  toFieldErrors,
} from "./authSchemas";
import { PasswordField } from "./PasswordField";

type FieldErrors = Record<string, string>;

const FIELD_ORDER = ["email", "password"] as const;

export function RegisterForm(): ReactElement {
  const registerMutation = useRegister();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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

    // 1. Quick checks in the browser (feedback only).
    const result = registerFormSchema.safeParse({ email, password });

    if (!result.success) {
      const errors = toFieldErrors(result.error);
      setFieldErrors(errors);
      focusFirstInvalidField(errors, FIELD_ORDER, "register");
      return;
    }

    setFieldErrors({});

    // 2. Ask the server. It repeats every check (and adds its own, like the
    //    common-password list). On success the account starts logged in and
    //    GuestRoute sends the person on.
    registerMutation.mutate(result.data, {
      onError: (error: unknown) => {
        const info = getApiErrorInfo(error);
        const hasFieldErrors = Object.keys(info.fieldErrors).length > 0;

        setFieldErrors(info.fieldErrors);
        setFormError(hasFieldErrors ? null : info.message);
        focusFirstInvalidField(info.fieldErrors, FIELD_ORDER, "register");
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <ErrorMessage
          title="Could not create your account"
          message={formError}
        />
      ) : null}

      <Input
        id="register-email"
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          clearFieldError("email");
        }}
        error={fieldErrors.email}
      />

      <PasswordField
        id="register-password"
        name="password"
        label="Password"
        autoComplete="new-password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. A few random words make a strong password.`}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          clearFieldError("password");
        }}
        error={fieldErrors.password}
      />

      <div className="space-y-2" aria-live="polite">
        <div
          role="progressbar"
          aria-label="Password length"
          aria-valuemin={0}
          aria-valuemax={PASSWORD_MIN_LENGTH}
          aria-valuenow={Math.min(password.length, PASSWORD_MIN_LENGTH)}
          className="h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className={`h-full rounded-full transition-all ${password.length >= PASSWORD_MIN_LENGTH ? "bg-emerald-500" : "bg-brand"}`}
            style={{ width: `${Math.min((password.length / PASSWORD_MIN_LENGTH) * 100, 100)}%` }}
          />
        </div>
        <p id="register-password-length" className={`text-sm font-medium ${password.length >= PASSWORD_MIN_LENGTH ? "text-success-strong" : "text-muted"}`}>
          {password.length < PASSWORD_MIN_LENGTH
            ? `${PASSWORD_MIN_LENGTH - password.length} more characters needed`
            : "Password length looks good"}
        </p>
      </div>

      <Button type="submit" fullWidth loading={registerMutation.isPending}>
        {registerMutation.isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
