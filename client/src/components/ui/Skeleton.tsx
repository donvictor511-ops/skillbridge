import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "../../lib/cn";

export type SkeletonProps = ComponentPropsWithoutRef<"div">;

// A grey placeholder shape shown while data loads. Set its size with
// className, for example "h-4 w-1/2". Wrap the loading area with
// aria-busy="true" so assistive tech knows content is on the way.
export function Skeleton({
  className,
  ...divProps
}: SkeletonProps): ReactElement {
  return (
    <div
      {...divProps}
      aria-hidden="true"
      className={cn(
        "rounded-control bg-line motion-safe:animate-pulse",
        className,
      )}
    />
  );
}
