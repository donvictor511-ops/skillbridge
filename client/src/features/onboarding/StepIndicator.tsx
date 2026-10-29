import type { ReactElement } from "react";
import { cn } from "../../lib/cn";

interface StepIndicatorProps {
  // 0-based index of the current step
  current: number;
  total: number;
}

export function StepIndicator({
  current,
  total,
}: StepIndicatorProps): ReactElement {
  return (
    <div>
      <p className="text-sm font-medium text-muted">
        Step {current + 1} of {total}
      </p>
      {/* The bars are decoration. The text above carries the meaning. */}
      <div className="mt-2 flex gap-2" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index <= current ? "bg-brand" : "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}
