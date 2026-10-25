import type { ReactElement } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

export interface ErrorMessageProps {
  message: string;
  title?: string;
  // If provided, a "Try again" button is shown.
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  message,
  title = "Something went wrong",
  onRetry,
  className,
}: ErrorMessageProps): ReactElement {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4",
        className,
      )}
    >
      <CircleAlert
        className="mt-0.5 h-5 w-5 shrink-0 text-danger-strong"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-danger-strong">{title}</p>
        <p className="mt-1 text-sm text-ink">{message}</p>
        {onRetry ? (
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
