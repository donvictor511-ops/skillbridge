import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { ChevronDown } from "lucide-react";
import { FormField } from "../forms/FormField";
import { cn } from "../../lib/cn";
import { getDescribedBy } from "../../lib/forms";
import {
  controlBaseClasses,
  controlErrorBorder,
  controlNormalBorder,
} from "./controlStyles";

export interface SelectProps extends ComponentPropsWithoutRef<"select"> {
  label: string;
  hint?: string;
  error?: string;
}

// A native <select>: accessible and great on phones. Pass <option> children.
export function Select({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
  ...selectProps
}: SelectProps): ReactElement {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <FormField
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <div className="relative">
        <select
          {...selectProps}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={getDescribedBy(selectId, hint, error)}
          className={cn(
            controlBaseClasses,
            "h-11 cursor-pointer appearance-none pr-10",
            error ? controlErrorBorder : controlNormalBorder,
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>
    </FormField>
  );
}
