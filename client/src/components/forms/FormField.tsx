import type { ReactElement, ReactNode } from "react";
import { CircleAlert } from "lucide-react";

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

// Shared frame for Input, Textarea, and Select:
// label above, control in the middle, hint and error below.
export function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  children,
}: FormFieldProps): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-danger-strong">
            *
          </span>
        ) : null}
      </label>

      {children}

      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-sm text-danger-strong"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
