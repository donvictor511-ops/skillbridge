import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "../../lib/cn";

export type CardPadding = "none" | "md" | "lg";

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  padding?: CardPadding;
}

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-8",
};

export function Card({
  padding = "md",
  className,
  children,
  ...divProps
}: CardProps): ReactElement {
  return (
    <div
      {...divProps}
      className={cn(
        "rounded-2xl border border-line bg-surface shadow-card",
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
