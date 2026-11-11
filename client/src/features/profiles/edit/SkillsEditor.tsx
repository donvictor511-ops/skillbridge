import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { ErrorMessage } from "../../../components/ui";
import { useUnsavedChangesWarning } from "../../../hooks/useUnsavedChangesWarning";
import { getApiErrorInfo } from "../../../lib/apiError";
import { toTopLevelErrors } from "../../../lib/fieldErrors";
import type { OwnerProfile } from "../../../types/profile";
import {
  MAX_SKILLS,
  suggestedSkills,
} from "../../onboarding/onboardingOptions";
import { SkillsInput } from "../../onboarding/SkillsInput";
import { ProfileSection } from "../ProfileSection";
import { useReplaceSkills } from "./profileEditMutations";
import { SaveBar } from "./SaveBar";

function toNames(profile: OwnerProfile): string[] {
  return profile.skills.map((skill) => skill.name);
}

// Two lists are the same if they hold the same skills, ignoring order and capitals.
function sameSkills(a: readonly string[], b: readonly string[]): boolean {
  const left = a.map((name) => name.toLowerCase());
  const right = b.map((name) => name.toLowerCase());
  return (
    left.length === right.length && left.every((name) => right.includes(name))
  );
}

interface SkillsEditorProps {
  profile: OwnerProfile;
}

export function SkillsEditor({ profile }: SkillsEditorProps): ReactElement {
  const replaceMutation = useReplaceSkills();

  const [saved, setSaved] = useState<string[]>(() => toNames(profile));
  const [skills, setSkills] = useState<string[]>(() => toNames(profile));
  const [error, setError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const isDirty = !sameSkills(saved, skills);

  useUnsavedChangesWarning(isDirty);

  function handleChange(next: string[]): void {
    setSkills(next);
    setError(undefined);
    setJustSaved(false);
  }

  function handleCancel(): void {
    setSkills(saved);
    setError(undefined);
    setFormError(null);
    setJustSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    if (!isDirty) {
      return;
    }

    replaceMutation.mutate(skills, {
      onSuccess: (savedProfile) => {
        const next = toNames(savedProfile);
        setSaved(next);
        setSkills(next);
        setError(undefined);
        setJustSaved(true);
      },
      onError: (caught: unknown) => {
        const info = getApiErrorInfo(caught);
        const topLevel = toTopLevelErrors(info.fieldErrors);

        // The server's message for a bad skill shows under the skills field.
        setError(topLevel.skills);
        setFormError(info.message);
      },
    });
  }

  return (
    <ProfileSection
      title="Skills"
      description="The skills people should find you for."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <ErrorMessage
            title="Could not save your skills"
            message={formError}
          />
        ) : null}

        <SkillsInput
          id="skills-editor-input"
          skills={skills}
          suggestions={suggestedSkills}
          max={MAX_SKILLS}
          error={error}
          onChange={handleChange}
        />

        <SaveBar
          isDirty={isDirty}
          isSaving={replaceMutation.isPending}
          justSaved={justSaved}
          onCancel={handleCancel}
        />
      </form>
    </ProfileSection>
  );
}
