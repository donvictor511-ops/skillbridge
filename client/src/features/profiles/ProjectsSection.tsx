import { useState } from "react";
import type { ReactElement } from "react";
import { FolderOpen } from "lucide-react";
import { Badge, Card, ExternalLink } from "../../components/ui";
import { isSafeHttpsUrl } from "../../lib/url";
import type { ProfileProject } from "../../types/profile";
import { EmptySectionNote, ProfileSection } from "./ProfileSection";

interface ProjectImageProps {
  src: string | null;
  title: string;
}

// The project picture, or a neutral icon if there is none or it fails to load.
function ProjectImage({ src, title }: ProjectImageProps): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const imageSrc =
    src !== null && isSafeHttpsUrl(src) && src !== failedSrc ? src : null;

  return (
    <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-accent/15 text-navy">
      {imageSrc !== null ? (
        <img
          src={imageSrc}
          alt={`Preview of ${title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(imageSrc)}
          className="h-full w-full object-cover"
        />
      ) : (
        <FolderOpen className="h-10 w-10" aria-hidden="true" />
      )}
    </div>
  );
}

interface ProjectsSectionProps {
  projects: ProfileProject[];
  isOwner: boolean;
}

export function ProjectsSection({
  projects,
  isOwner,
}: ProjectsSectionProps): ReactElement | null {
  if (projects.length === 0 && !isOwner) {
    return null;
  }

  return (
    <ProfileSection
      title="Portfolio"
      description={
        projects.length > 0
          ? "Real work that shows what this person can do."
          : undefined
      }
    >
      {projects.length === 0 ? (
        <EmptySectionNote />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Card
                padding="none"
                className="flex h-full flex-col overflow-hidden"
              >
                <ProjectImage src={project.imageUrl} title={project.title} />
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="break-words text-base font-semibold text-navy">
                    {project.title}
                  </h3>
                  <p className="mt-1 line-clamp-4 break-words text-sm text-ink">
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
                    <div className="mt-4 text-sm">
                      <ExternalLink href={project.projectUrl}>
                        View project
                      </ExternalLink>
                    </div>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}
