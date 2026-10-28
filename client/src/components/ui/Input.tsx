import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
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
  // Something shown inside the right edge of the field (for example a button).
  endAdornment?: ReactNode;
}

export function Input({
  id,
  label,
  hint,
  error,
  required,
  endAdornment,
  className,
  ...inputProps
}: InputProps): ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const control = (
    <input
      {...inputProps}
      id={inputId}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={getDescribedBy(inputId, hint, error)}
      className={cn(
        controlBaseClasses,
        "h-11",
        endAdornment ? "pr-12" : false,
        error ? controlErrorBorder : controlNormalBorder,
        className,
      )}
    />
  );

  return (
    <FormField
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      {endAdornment ? (
        <div className="relative">
          {control}
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        </div>
      ) : (
        control
      )}
    </FormField>
  );
}
