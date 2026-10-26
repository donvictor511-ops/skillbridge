import type { ReactElement, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface PageMessageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  // A short label shown above the title, for example "Error 404".
  code?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

// One consistent design for "something other than normal content" pages:
// not found, access denied, errors, and not-yet-built features.
export function PageMessage({
  icon: Icon,
  title,
  description,
  code,
  badge,
  actions,
  className,
}: PageMessageProps): ReactElement {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-navy">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>

      {badge ? <div className="mt-4">{badge}</div> : null}

      {code ? (
        <p className="mt-4 text-sm font-semibold text-muted">{code}</p>
      ) : null}

      <h1 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
      <p className="mt-3 text-base text-muted">{description}</p>

      {actions ? (
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
