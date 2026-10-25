import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { FormField } from "../forms/FormField";
import { cn } from "../../lib/cn";
import { getDescribedBy } from "../../lib/forms";
import {
  controlBaseClasses,
  controlErrorBorder,
  controlNormalBorder,
} from "./controlStyles";

export interface InputProps extends ComponentPropsWithoutRef<"input"> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({
  id,
  label,
  hint,
  error,
  required,
  className,
  ...inputProps
}: InputProps): ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        {...inputProps}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescribedBy(inputId, hint, error)}
        className={cn(
          controlBaseClasses,
          "h-11",
          error ? controlErrorBorder : controlNormalBorder,
          className,
        )}
      />
    </FormField>
  );
}
