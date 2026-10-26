import type { ReactElement } from "react";

interface SectionHeadingProps {
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
}

export function SectionHeading({
  id,
  title,
  eyebrow,
  description,
}: SectionHeadingProps): ReactElement {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <p className="text-sm font-semibold text-brand">{eyebrow}</p>
      ) : null}
      <h2 id={id} className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base text-muted">{description}</p>
      ) : null}
    </div>
  );
}
