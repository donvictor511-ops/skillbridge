import { useState } from "react";
import type { ReactElement } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "../../../components/ui";
import { getApiErrorInfo } from "../../../lib/apiError";
import { formatDateRange } from "../../../lib/dates";
import type { ProfileExperience } from "../../../types/profile";
import { ProfileSection } from "../ProfileSection";
import { ConfirmDelete } from "./ConfirmDelete";
import { MAX_EXPERIENCES } from "./editSchemas";
import { ExperienceForm } from "./ExperienceForm";
import { useDeleteExperience } from "./profileEditMutations";

// Which form is open: none, the "add" form, or the "edit" form of one job.
type EditorState =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; id: string };

interface ExperienceManagerProps {
  experiences: ProfileExperience[];
}

export function ExperienceManager({
  experiences,
}: ExperienceManagerProps): ReactElement {
  const deleteMutation = useDeleteExperience();

  const [editor, setEditor] = useState<EditorState>({ kind: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const isEditorOpen = editor.kind !== "closed";
  const atLimit = experiences.length >= MAX_EXPERIENCES;

  function handleSaved(message: string): void {
    setEditor({ kind: "closed" });
    setStatus(message);
  }

  function handleConfirmDelete(id: string): void {
    setDeleteError(null);
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeletingId(null);
        setStatus("Job deleted.");
      },
      onError: (error: unknown) => {
        setDeleteError(getApiErrorInfo(error).message);
      },
    });
  }

  return (
    <ProfileSection
      title="Experience"
      description={`${experiences.length} of ${MAX_EXPERIENCES} jobs. A current job has no end date.`}
    >
      {status ? (
        <p
          role="status"
          className="mb-4 flex items-center gap-1.5 text-sm text-success-strong"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          {status}
        </p>
      ) : null}

      {experiences.length === 0 && editor.kind !== "add" ? (
        <p className="text-sm text-muted">Nothing added yet.</p>
      ) : null}

      <ul className="space-y-4">
        {experiences.map((experience) => {
          const isEditing =
            editor.kind === "edit" && editor.id === experience.id;

          return (
            <li
              key={experience.id}
              className="rounded-xl border border-line p-4"
            >
              {isEditing ? (
                <ExperienceForm
                  initial={experience}
                  onSaved={() => handleSaved("Job saved.")}
                  onCancel={() => setEditor({ kind: "closed" })}
                />
              ) : (
                <>
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

                  {deletingId === experience.id ? (
                    <ConfirmDelete
                      question={`Delete "${experience.title}"?`}
                      isDeleting={deleteMutation.isPending}
                      error={deleteError}
                      onConfirm={() => handleConfirmDelete(experience.id)}
                      onCancel={() => setDeletingId(null)}
                    />
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isEditorOpen}
                        aria-label={`Edit ${experience.title} at ${experience.company}`}
                        onClick={() => {
                          setStatus(null);
                          setEditor({ kind: "edit", id: experience.id });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isEditorOpen}
                        aria-label={`Delete ${experience.title} at ${experience.company}`}
                        onClick={() => {
                          setStatus(null);
                          setDeleteError(null);
                          setDeletingId(experience.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}

        {editor.kind === "add" ? (
          <li className="rounded-xl border border-brand p-4">
            <ExperienceForm
              onSaved={() => handleSaved("Job added.")}
              onCancel={() => setEditor({ kind: "closed" })}
            />
          </li>
        ) : null}
      </ul>

      <div className="mt-4">
        <Button
          variant="secondary"
          disabled={isEditorOpen || atLimit}
          onClick={() => {
            setStatus(null);
            setEditor({ kind: "add" });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add a job
        </Button>
        {atLimit ? (
          <p className="mt-2 text-sm text-muted">
            You have reached the limit of {MAX_EXPERIENCES} jobs.
          </p>
        ) : null}
      </div>
    </ProfileSection>
  );
}
