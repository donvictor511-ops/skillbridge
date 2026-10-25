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

export interface TextareaProps extends ComponentPropsWithoutRef<"textarea"> {
  label: string;
  hint?: string;
  error?: string;
}

export function Textarea({
  id,
  label,
  hint,
  error,
  required,
  rows = 4,
  className,
  ...textareaProps
}: TextareaProps): ReactElement {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <FormField
      id={textareaId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <textarea
        {...textareaProps}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescribedBy(textareaId, hint, error)}
        className={cn(
          controlBaseClasses,
          "resize-y py-2.5",
          error ? controlErrorBorder : controlNormalBorder,
          className,
        )}
      />
    </FormField>
  );
}
