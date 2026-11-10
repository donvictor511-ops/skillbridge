import type { ReactElement } from "react";
import { formatDateRange } from "../../lib/dates";
import type { ProfileExperience } from "../../types/profile";
import { EmptySectionNote, ProfileSection } from "./ProfileSection";

interface ExperienceSectionProps {
  experiences: ProfileExperience[];
  isOwner: boolean;
}

export function ExperienceSection({
  experiences,
  isOwner,
}: ExperienceSectionProps): ReactElement | null {
  if (experiences.length === 0 && !isOwner) {
    return null;
  }

  return (
    <ProfileSection title="Experience">
      {experiences.length === 0 ? (
        <EmptySectionNote />
      ) : (
        <ol className="space-y-6">
          {experiences.map((experience) => (
            <li key={experience.id} className="border-l-2 border-line pl-4">
              <h3 className="break-words text-base font-semibold text-navy">
                {experience.title}
              </h3>
              <p className="break-words text-sm text-ink">
                {experience.company}
                {experience.location ? ` · ${experience.location}` : ""}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {formatDateRange(experience.startDate, experience.endDate)}
              </p>
              {experience.description ? (
                <p className="mt-2 whitespace-pre-line break-words text-sm text-ink">
                  {experience.description}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </ProfileSection>
  );
}
