import type { ReactElement } from "react";
import { LayoutDashboard, Smartphone } from "lucide-react";
import { Avatar, Badge, Card } from "../ui";

interface PreviewProject {
  title: string;
  kind: string;
  icon: typeof Smartphone;
}

const previewProjects: PreviewProject[] = [
  {
    title: "Savings app redesign",
    kind: "Mobile case study",
    icon: Smartphone,
  },
  {
    title: "School portal dashboard",
    kind: "Web case study",
    icon: LayoutDashboard,
  },
];

const previewSkills: string[] = ["Figma", "UX research", "Prototyping"];

// A decorative ILLUSTRATION of what a profile can look like.
// It is built from our own components, uses an invented example person,
// and is hidden from screen readers (aria-hidden) because it adds no
// information. The caption keeps it honest for everyone who can see it.
export function ProfilePreviewCard(): ReactElement {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-brand/15 blur-3xl" />

      <Card padding="lg" className="relative">
        <div className="flex items-center gap-4">
          <Avatar name="Amara Okafor" size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-navy">
              Amara Okafor
            </p>
            <p className="truncate text-sm text-muted">
              Product designer · Lagos
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink">
          Designs clear, accessible interfaces for finance and education
          products.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {previewSkills.map((skill) => (
            <Badge key={skill} tone="brand">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Portfolio
          </p>
          <ul className="mt-3 space-y-3">
            {previewProjects.map(({ title, kind, icon: Icon }) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-xl border border-line p-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent/15 text-navy">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">
                    {title}
                  </p>
                  <p className="truncate text-xs text-muted">{kind}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-muted">
        Illustration: an example profile
      </p>
    </div>
  );
}
