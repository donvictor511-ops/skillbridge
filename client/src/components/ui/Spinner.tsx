import type { ReactElement } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../lib/cn";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  // Text read by screen readers. If omitted, the spinner is purely decorative.
  label?: string;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

// The spinner uses the surrounding text color (currentColor).
export function Spinner({
  size = "md",
  label,
  className,
}: SpinnerProps): ReactElement {
  const icon = (
    <LoaderCircle
      aria-hidden="true"
      className={cn(
        sizeClasses[size],
        "shrink-0 motion-safe:animate-spin",
        className,
      )}
    />
  );

  if (label === undefined) {
    return icon;
  }

  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
