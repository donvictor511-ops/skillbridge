import type { ReactElement } from "react";
import { Badge } from "../../components/ui";
import { interestOptions } from "../onboarding/onboardingOptions";
import { EmptySectionNote, ProfileSection } from "./ProfileSection";

interface AboutSectionProps {
  bio: string | null;
  interests: string[];
  isOwner: boolean;
}

export function AboutSection({
  bio,
  interests,
  isOwner,
}: AboutSectionProps): ReactElement | null {
  const isEmpty = bio === null && interests.length === 0;

  // Visitors never see an empty box.
  if (isEmpty && !isOwner) {
    return null;
  }

  return (
    <ProfileSection title="About">
      {isEmpty ? <EmptySectionNote /> : null}

      {bio !== null ? (
        // The bio is plain text. React shows it as text (never as HTML), and
        // whitespace-pre-line keeps the author's line breaks.
        <p className="whitespace-pre-line break-words text-base text-ink">
          {bio}
        </p>
      ) : null}

      {interests.length > 0 ? (
        <div className={bio !== null ? "mt-5" : ""}>
          <h3 className="text-sm font-semibold text-navy">Interests</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {interests.map((interest) => (
              <li key={interest}>
                <Badge tone="neutral">
                  {interestOptions.find((option) => option.value === interest)
                    ?.label ?? interest}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ProfileSection>
  );
}
