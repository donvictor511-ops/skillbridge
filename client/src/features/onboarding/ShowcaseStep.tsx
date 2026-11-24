import type { ChangeEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Avatar, Input, Textarea } from "../../components/ui";
import type { OnboardingInput } from "../../types/onboarding";
import type { ShowcaseDraft } from "./onboardingSchemas";

interface ShowcaseStepProps {
  values: OnboardingInput;
  draft: ShowcaseDraft;
  avatarFile: File | null;
  errors: Record<string, string>;
  photoError: string | null;
  onDraftChange: (patch: Partial<ShowcaseDraft>) => void;
  onPhotoSelect: (file: File | null) => void;
}

export function ShowcaseStep({
  values,
  draft,
  avatarFile,
  errors,
  photoError,
  onDraftChange,
  onPhotoSelect,
}: ShowcaseStepProps): ReactElement {
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.currentTarget;
    const file = input.files?.[0] ?? null;
    input.value = "";
    onPhotoSelect(file);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
        <div className="flex items-center gap-4">
          {photoPreviewUrl ? (
            <img src={photoPreviewUrl} alt="Selected profile photo preview" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          ) : (
            <Avatar name={values.displayName || "Your profile"} size="lg" />
          )}
          <div>
            <h3 className="font-semibold text-navy">Add a profile photo</h3>
            <p className="mt-1 text-sm text-muted">A clear photo helps people recognize and trust your profile. Optional; JPEG, PNG, or WebP up to 5 MB.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="onboarding-avatar" className="inline-flex min-h-10 cursor-pointer items-center rounded-control border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-page">
            {avatarFile ? "Choose another photo" : "Choose a photo"}
            <input id="onboarding-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
          </label>
          {avatarFile ? <span className="max-w-56 truncate text-sm text-muted">{avatarFile.name}</span> : <span className="text-sm text-muted">You can add one later from Edit profile.</span>}
          {avatarFile ? <button type="button" onClick={() => onPhotoSelect(null)} className="text-sm font-semibold text-danger hover:underline">Remove</button> : null}
        </div>
        {photoError ? <p role="alert" className="mt-2 text-sm text-danger-strong">{photoError}</p> : null}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-navy">Show one piece of your work</h3>
          <p className="mt-1 text-sm text-muted">A client project, school assignment, personal build, or volunteer work all count. You can add more later.</p>
        </div>
        <Input id="onboarding-projectTitle" label="Project title (optional)" value={draft.projectTitle} onChange={(event) => onDraftChange({ projectTitle: event.target.value })} error={errors.projectTitle} />
        <Textarea id="onboarding-projectDescription" label="What did you make or contribute?" hint="A few sentences about the work you did and the result." rows={4} value={draft.projectDescription} onChange={(event) => onDraftChange({ projectDescription: event.target.value })} error={errors.projectDescription} />
        <Input id="onboarding-projectUrl" label="Project link (optional)" type="url" inputMode="url" placeholder="https://" value={draft.projectUrl} onChange={(event) => onDraftChange({ projectUrl: event.target.value })} error={errors.projectUrl} />
        {values.skills.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Skills you used (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {values.skills.map((skill) => {
                const checked = draft.projectSkills.includes(skill);
                return (
                  <label key={skill} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${checked ? "border-brand bg-brand/10 text-brand" : "border-line bg-surface text-ink"}`}>
                    <input type="checkbox" checked={checked} disabled={!checked && draft.projectSkills.length >= 10} onChange={() => onDraftChange({ projectSkills: checked ? draft.projectSkills.filter((item) => item !== skill) : [...draft.projectSkills, skill] })} />
                    {skill}
                  </label>
                );
              })}
            </div>
            <p id="onboarding-projectSkills" className="text-xs text-muted">Choose up to 10 skills you used in this work.</p>
            {errors.projectSkills ? <p role="alert" className="text-sm text-danger-strong">{errors.projectSkills}</p> : null}
          </fieldset>
        ) : null}
      </div>
      <p className="rounded-xl bg-page p-3 text-sm text-muted">Your selected profile photo will still be saved. You can skip the project and add it later from Edit profile.</p>
    </div>
  );
}
