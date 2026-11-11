import { useState } from "react";
import type { ReactElement } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "../../../components/ui";
import { getApiErrorInfo } from "../../../lib/apiError";
import { formatYearRange } from "../../../lib/dates";
import type { ProfileEducation } from "../../../types/profile";
import { ProfileSection } from "../ProfileSection";
import { ConfirmDelete } from "./ConfirmDelete";
import { MAX_EDUCATION_ENTRIES } from "./editSchemas";
import { EducationForm } from "./EducationForm";
import { useDeleteEducation } from "./profileEditMutations";

type EditorState =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; id: string };

interface EducationManagerProps {
  education: ProfileEducation[];
}

export function EducationManager({
  education,
}: EducationManagerProps): ReactElement {
  const deleteMutation = useDeleteEducation();

  const [editor, setEditor] = useState<EditorState>({ kind: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const isEditorOpen = editor.kind !== "closed";
  const atLimit = education.length >= MAX_EDUCATION_ENTRIES;

  function handleSaved(message: string): void {
    setEditor({ kind: "closed" });
    setStatus(message);
  }

  function handleConfirmDelete(id: string): void {
    setDeleteError(null);
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeletingId(null);
        setStatus("Entry deleted.");
      },
      onError: (error: unknown) => {
        setDeleteError(getApiErrorInfo(error).message);
      },
    });
  }

  return (
    <ProfileSection
      title="Education"
      description={`${education.length} of ${MAX_EDUCATION_ENTRIES} entries.`}
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

      {education.length === 0 && editor.kind !== "add" ? (
        <p className="text-sm text-muted">Nothing added yet.</p>
      ) : null}

      <ul className="space-y-4">
        {education.map((entry) => {
          const isEditing = editor.kind === "edit" && editor.id === entry.id;
          const studies = [entry.degree, entry.fieldOfStudy]
            .filter((part): part is string => part !== null)
            .join(", ");
          const years = formatYearRange(entry.startYear, entry.endYear);

          return (
            <li key={entry.id} className="rounded-xl border border-line p-4">
              {isEditing ? (
                <EducationForm
                  initial={entry}
                  onSaved={() => handleSaved("Entry saved.")}
                  onCancel={() => setEditor({ kind: "closed" })}
                />
              ) : (
                <>
                  <h3 className="break-words text-base font-semibold text-navy">
                    {entry.school}
                  </h3>
                  {studies !== "" ? (
                    <p className="break-words text-sm text-ink">{studies}</p>
                  ) : null}
                  {years !== null ? (
                    <p className="mt-0.5 text-sm text-muted">{years}</p>
                  ) : null}

                  {deletingId === entry.id ? (
                    <ConfirmDelete
                      question={`Delete "${entry.school}"?`}
                      isDeleting={deleteMutation.isPending}
                      error={deleteError}
                      onConfirm={() => handleConfirmDelete(entry.id)}
                      onCancel={() => setDeletingId(null)}
                    />
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isEditorOpen}
                        aria-label={`Edit ${entry.school}`}
                        onClick={() => {
                          setStatus(null);
                          setEditor({ kind: "edit", id: entry.id });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isEditorOpen}
                        aria-label={`Delete ${entry.school}`}
                        onClick={() => {
                          setStatus(null);
                          setDeleteError(null);
                          setDeletingId(entry.id);
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
            <EducationForm
              onSaved={() => handleSaved("Entry added.")}
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
          Add education
        </Button>
        {atLimit ? (
          <p className="mt-2 text-sm text-muted">
            You have reached the limit of {MAX_EDUCATION_ENTRIES} entries.
          </p>
        ) : null}
      </div>
    </ProfileSection>
  );
}
