import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonStyleOptions {
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-active",
  secondary:
    "border border-line bg-surface text-navy hover:border-muted hover:bg-page active:bg-line",
  ghost: "bg-transparent text-brand hover:bg-brand/10 active:bg-brand/20",
  danger: "bg-danger text-white hover:bg-danger-strong active:bg-danger-strong",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

// Kept separate so a link (<a> or React Router <Link>) can look like a button
// later, using exactly the same styles.
export function getButtonClasses({
  variant,
  size,
  fullWidth,
}: ButtonStyleOptions): string {
  return cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
  );
}
