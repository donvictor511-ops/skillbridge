import type { ReactElement, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type SectionTone = "page" | "surface";

interface SectionProps {
  // Lets links like "#how-it-works" jump to this section.
  id?: string;
  // The id of the heading inside, so screen readers can name the section.
  labelledBy: string;
  tone?: SectionTone;
  children: ReactNode;
}

export function Section({
  id,
  labelledBy,
  tone = "page",
  children,
}: SectionProps): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      // scroll-mt keeps the heading from hiding under the sticky header.
      className={cn(
        "scroll-mt-20 py-16 sm:py-20",
        tone === "surface" && "border-y border-line bg-surface",
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}
