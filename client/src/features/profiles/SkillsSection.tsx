import type { ReactElement } from "react";
import type { ProfileSkill } from "../../types/profile";
import { EmptySectionNote, ProfileSection } from "./ProfileSection";

interface SkillsSectionProps {
  skills: ProfileSkill[];
  isOwner: boolean;
}

export function SkillsSection({
  skills,
  isOwner,
}: SkillsSectionProps): ReactElement | null {
  if (skills.length === 0 && !isOwner) {
    return null;
  }

  const hasProof = skills.some((skill) => skill.projectCount > 0);

  return (
    <ProfileSection
      title="Skills"
      description={
        hasProof
          ? "A number shows how many portfolio projects use that skill."
          : undefined
      }
    >
      {skills.length === 0 ? (
        <EmptySectionNote />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li
              key={skill.id}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink"
            >
              <span className="break-words">{skill.name}</span>
              {skill.projectCount > 0 ? (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-navy">
                  {skill.projectCount}{" "}
                  {skill.projectCount === 1 ? "project" : "projects"}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}
