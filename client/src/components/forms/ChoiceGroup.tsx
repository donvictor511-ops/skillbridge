import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, CircleAlert } from "lucide-react";
import { cn } from "../../lib/cn";
import { getDescribedBy } from "../../lib/forms";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface ChoiceGroupProps<T extends string> {
  // Also the id used to move keyboard focus here when there is an error.
  id: string;
  legend: string;
  hint?: string;
  options: readonly ChoiceOption<T>[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  variant?: "card" | "chip";
  maxSelected?: number;
  required?: boolean;
  error?: string;
}

// A group of checkboxes, styled as cards or chips. Real checkboxes underneath,
// so keyboard (Tab, Space) and screen readers work. A selected item shows a
// check icon, so selection is never shown by color alone.
export function ChoiceGroup<T extends string>({
  id,
  legend,
  hint,
  options,
  selected,
  onChange,
  variant = "chip",
  maxSelected,
  required = false,
  error,
}: ChoiceGroupProps<T>): ReactElement {
  function toggle(value: T): void {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  const focusRing =
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand";

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={getDescribedBy(id, hint, error)}
      className="min-w-0"
    >
      <legend className="text-sm font-medium text-ink">
        {legend}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-danger-strong">
            *
          </span>
        ) : null}
      </legend>

      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}

      <div
        className={cn(
          "mt-3",
          variant === "card"
            ? "grid gap-3 sm:grid-cols-2"
            : "flex flex-wrap gap-2",
        )}
      >
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          const isDisabled =
            !isSelected &&
            maxSelected !== undefined &&
            selected.length >= maxSelected;
          const Icon = option.icon;

          if (variant === "card") {
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                  focusRing,
                  isSelected
                    ? "border-brand bg-brand/10"
                    : "border-line bg-surface hover:border-muted",
                  isDisabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggle(option.value)}
                />
                {Icon ? (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent/15 text-navy">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 block text-sm text-muted">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    isSelected
                      ? "border-brand bg-brand text-white"
                      : "border-muted bg-surface",
                  )}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </label>
            );
          }

          return (
            <label
              key={option.value}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                focusRing,
                isSelected
                  ? "border-brand bg-brand/10 text-navy"
                  : "border-line bg-surface text-ink hover:border-muted",
                isDisabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(option.value)}
              />
              {isSelected ? (
                <Check className="h-4 w-4 text-brand" aria-hidden="true" />
              ) : null}
              {option.label}
            </label>
          );
        })}
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-3 flex items-start gap-1.5 text-sm text-danger-strong"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
