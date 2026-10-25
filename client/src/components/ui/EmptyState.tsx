import type { ReactElement, ReactNode } from "react";
import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  // Usually a Button that helps the user take the next step.
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-10 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-navy">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-base font-semibold text-navy">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
