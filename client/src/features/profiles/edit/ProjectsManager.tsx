import { useState } from "react";
import type { ReactElement } from "react";
import { Check, Plus } from "lucide-react";
import { Badge, Button, ExternalLink } from "../../../components/ui";
import { getApiErrorInfo } from "../../../lib/apiError";
import type { ProfileProject, ProfileSkill } from "../../../types/profile";
import { ProfileSection } from "../ProfileSection";
import { ConfirmDelete } from "./ConfirmDelete";
import { MAX_PROJECTS } from "./portfolioSchemas";
import { useDeleteProject } from "./portfolioMutations";
import { ProjectForm } from "./ProjectForm";

// Which form is open: none, the "add" form, or the "edit" form of one project.
type EditorState =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; id: string };

interface ProjectsManagerProps {
  projects: ProfileProject[];
  // The skills on your profile (the choices inside the project form).
  skills: ProfileSkill[];
}

export function ProjectsManager({
  projects,
  skills,
}: ProjectsManagerProps): ReactElement {
  const deleteMutation = useDeleteProject();

  const [editor, setEditor] = useState<EditorState>({ kind: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const isEditorOpen = editor.kind !== "closed";
  const atLimit = projects.length >= MAX_PROJECTS;

  function handleSaved(message: string): void {
    setEditor({ kind: "closed" });
    setStatus(message);
  }

  function handleConfirmDelete(id: string): void {
    setDeleteError(null);
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeletingId(null);
        setStatus("Project deleted.");
      },
      onError: (error: unknown) => {
        setDeleteError(getApiErrorInfo(error).message);
      },
    });
  }

  return (
    <ProfileSection
      title="Portfolio"
      description={`${projects.length} of ${MAX_PROJECTS} projects. Real work that proves your skills.`}
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

      {projects.length === 0 && editor.kind !== "add" ? (
        <p className="text-sm text-muted">Nothing added yet.</p>
      ) : null}

      <ul className="space-y-4">
        {projects.map((project) => {
          const isEditing = editor.kind === "edit" && editor.id === project.id;

          return (
            <li key={project.id} className="rounded-xl border border-line p-4">
              {isEditing ? (
                <ProjectForm
                  profileSkills={skills}
                  initial={project}
                  onSaved={() => handleSaved("Project saved.")}
                  onCancel={() => setEditor({ kind: "closed" })}
                />
              ) : (
                <>
                  <h3 className="break-words text-base font-semibold text-navy">
                    {project.title}
                  </h3>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-sm text-ink">
                    {project.description}
                  </p>

                  {project.skills.length > 0 ? (
                    <ul
                      className="mt-3 flex flex-wrap gap-1.5"
                      aria-label="Skills used"
                    >
                      {project.skills.map((skill) => (
                        <li key={skill.id}>
                          <Badge tone="brand">{skill.name}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {project.projectUrl ? (
                    <div className="mt-3 text-sm">
                      <ExternalLink href={project.projectUrl}>
                        View project
                      </ExternalLink>
                    </div>
                  ) : null}

                  {deletingId === project.id ? (
                    <ConfirmDelete
                      question={`Delete "${project.title}"?`}
                      isDeleting={deleteMutation.isPending}
                      error={deleteError}
                      onConfirm={() => handleConfirmDelete(project.id)}
                      onCancel={() => setDeletingId(null)}
                    />
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isEditorOpen}
                        aria-label={`Edit ${project.title}`}
                        onClick={() => {
                          setStatus(null);
                          setEditor({ kind: "edit", id: project.id });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isEditorOpen}
                        aria-label={`Delete ${project.title}`}
                        onClick={() => {
                          setStatus(null);
                          setDeleteError(null);
                          setDeletingId(project.id);
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
            <ProjectForm
              profileSkills={skills}
              onSaved={() => handleSaved("Project added.")}
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
          Add a project
        </Button>
        {atLimit ? (
          <p className="mt-2 text-sm text-muted">
            You have reached the limit of {MAX_PROJECTS} projects.
          </p>
        ) : null}
      </div>
    </ProfileSection>
  );
}
