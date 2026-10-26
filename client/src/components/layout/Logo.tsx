import type { ReactElement } from "react";
import { cn } from "../../lib/cn";

export type LogoTone = "default" | "inverse";

interface LogoProps {
  tone?: LogoTone;
  className?: string;
}

// An original SkillBridge mark: a small bridge arch on a rounded square.
// Colors come from our design tokens through Tailwind classes.
export function Logo({ tone = "default", className }: LogoProps): ReactElement {
  const isInverse = tone === "inverse";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          width="32"
          height="32"
          rx="8"
          className={isInverse ? "fill-white" : "fill-navy"}
        />
        <path
          d="M6 21C9 10 23 10 26 21"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-accent"
        />
        <path
          d="M12 14V21M20 14V21"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-accent"
        />
        <path
          d="M5 21H27"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={isInverse ? "stroke-navy" : "stroke-white"}
        />
      </svg>
      <span
        className={cn(
          "text-lg font-bold tracking-tight",
          isInverse ? "text-white" : "text-navy",
        )}
      >
        SkillBridge
      </span>
    </span>
  );
}
