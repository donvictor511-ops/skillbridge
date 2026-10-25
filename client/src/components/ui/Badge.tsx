import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "../../lib/cn";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-line text-ink",
  brand: "bg-brand/10 text-brand",
  accent: "bg-accent/15 text-navy",
  success: "bg-success/10 text-success-strong",
  warning: "bg-warning/10 text-warning-strong",
  danger: "bg-danger/10 text-danger-strong",
};

// Tip: for status badges, put a word (and optionally an icon) inside.
// Never rely on color alone to tell the user the status.
export function Badge({
  tone = "neutral",
  className,
  children,
  ...spanProps
}: BadgeProps): ReactElement {
  return (
    <span
      {...spanProps}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
