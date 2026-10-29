import { useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "../../components/ui";
import { MAX_SKILL_LENGTH } from "./onboardingOptions";

interface SkillsInputProps {
  // Also the id of the text field, so focus can be moved here on errors.
  id: string;
  skills: string[];
  suggestions: readonly string[];
  max: number;
  error?: string;
  onChange: (next: string[]) => void;
}

export function SkillsInput({
  id,
  skills,
  suggestions,
  max,
  error,
  onChange,
}: SkillsInputProps): ReactElement {
  const [draft, setDraft] = useState<string>("");
  const [draftError, setDraftError] = useState<string | null>(null);
  // Read aloud by screen readers when a skill is added or removed.
  const [status, setStatus] = useState<string>("");

  function addSkill(rawName: string): void {
    const name = rawName.trim().replace(/\s+/g, " ");

    if (name === "") {
      return;
    }
    if (name.length > MAX_SKILL_LENGTH) {
      setDraftError(
        `Skill names must be at most ${MAX_SKILL_LENGTH} characters.`,
      );
      return;
    }
    if (skills.length >= max) {
      setDraftError(`You can add up to ${max} skills.`);
      return;
    }
    if (skills.some((skill) => skill.toLowerCase() === name.toLowerCase())) {
      setDraftError(`${name} is already added.`);
      return;
    }

    onChange([...skills, name]);
    setDraft("");
    setDraftError(null);
    setStatus(`Added ${name}.`);
  }

  function removeSkill(name: string): void {
    onChange(skills.filter((skill) => skill !== name));
    setStatus(`Removed ${name}.`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      // Enter adds the skill. It must NOT submit the whole wizard form.
      event.preventDefault();
      addSkill(draft);
    }
  }

  const availableSuggestions = suggestions.filter(
    (suggestion) =>
      !skills.some((skill) => skill.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div>
      <Input
        id={id}
        label="Skills"
        hint={`Type a skill and press Enter. You can add up to ${max}.`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setDraftError(null);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        error={draftError ?? error}
        endAdornment={
          <button
            type="button"
            onClick={() => addSkill(draft)}
            disabled={draft.trim() === ""}
            aria-label="Add skill"
            className="inline-flex h-9 w-9 items-center justify-center rounded-control text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        }
      />

      <p role="status" className="sr-only">
        {status}
      </p>

      {skills.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Your skills">
          {skills.map((skill) => (
            <li
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 py-1 pl-3 pr-1 text-sm font-medium text-brand-hover"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-brand/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-sm text-muted">
        {skills.length} of {max} skills added
      </p>

      {availableSuggestions.length > 0 && skills.length < max ? (
        <div className="mt-3">
          <p className="text-sm text-muted">Quick add</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addSkill(suggestion)}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink transition-colors hover:border-muted"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
