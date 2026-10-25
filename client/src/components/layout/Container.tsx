import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "../../lib/cn";

export type ContainerProps = ComponentPropsWithoutRef<"div">;

// Keeps page content a readable width and gives it side padding.
export function Container({
  className,
  children,
  ...divProps
}: ContainerProps): ReactElement {
  return (
    <div
      {...divProps}
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
    >
      {children}
    </div>
  );
}
