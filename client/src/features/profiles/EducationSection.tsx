import type { ReactElement } from "react";
import { formatYearRange } from "../../lib/dates";
import type { ProfileEducation } from "../../types/profile";
import { EmptySectionNote, ProfileSection } from "./ProfileSection";

interface EducationSectionProps {
  education: ProfileEducation[];
  isOwner: boolean;
}

export function EducationSection({
  education,
  isOwner,
}: EducationSectionProps): ReactElement | null {
  if (education.length === 0 && !isOwner) {
    return null;
  }

  return (
    <ProfileSection title="Education">
      {education.length === 0 ? (
        <EmptySectionNote />
      ) : (
        <ol className="space-y-6">
          {education.map((entry) => {
            const studies = [entry.degree, entry.fieldOfStudy]
              .filter((part): part is string => part !== null)
              .join(", ");
            const years = formatYearRange(entry.startYear, entry.endYear);

            return (
              <li key={entry.id} className="border-l-2 border-line pl-4">
                <h3 className="break-words text-base font-semibold text-navy">
                  {entry.school}
                </h3>
                {studies !== "" ? (
                  <p className="break-words text-sm text-ink">{studies}</p>
                ) : null}
                {years !== null ? (
                  <p className="mt-0.5 text-sm text-muted">{years}</p>
                ) : null}
                {entry.description ? (
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-ink">
                    {entry.description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </ProfileSection>
  );
}
