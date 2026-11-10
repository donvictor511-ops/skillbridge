import { useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { Card } from "../../components/ui";

interface ProfileSectionProps {
  title: string;
  // Optional one-line explanation under the title.
  description?: string;
  children: ReactNode;
}

// One card on the profile page, with an h2 heading that names the section
// for screen readers.
export function ProfileSection({
  title,
  description,
  children,
}: ProfileSectionProps): ReactElement {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <Card padding="lg">
        <h2 id={headingId} className="text-lg font-semibold text-navy">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </Card>
    </section>
  );
}

// Shown to the OWNER when a section has no entries yet.
export function EmptySectionNote(): ReactElement {
  return <p className="text-sm text-muted">Nothing added yet.</p>;
}
