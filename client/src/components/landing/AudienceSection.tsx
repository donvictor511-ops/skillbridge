import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, Check, Clock } from "lucide-react";
import { Badge, Card } from "../ui";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

interface AudiencePoint {
  text: string;
  // true = not built yet. Shown with a clock icon AND a "Planned" label.
  planned?: boolean;
}

interface Audience {
  icon: LucideIcon;
  title: string;
  description: string;
  points: AudiencePoint[];
}

const audiences: Audience[] = [
  {
    icon: Briefcase,
    title: "For professionals",
    description:
      "Developers, designers, writers, marketers, freelancers, and job seekers.",
    points: [
      { text: "Build a profile backed by real projects" },
      { text: "Show your skills together with the work behind them" },
      { text: "Be discovered by clients and collaborators", planned: true },
    ],
  },
  {
    icon: Building2,
    title: "For clients and businesses",
    description:
      "Startups, companies, and individuals who need skilled people.",
    points: [
      { text: "Create a business profile people can trust" },
      { text: "Present your company and the work you do" },
      { text: "Find talent by skill and proven work", planned: true },
      { text: "Post jobs and projects", planned: true },
    ],
  },
];

export function AudienceSection(): ReactElement {
  return (
    <Section labelledBy="audience-heading">
      <SectionHeading
        id="audience-heading"
        eyebrow="Who it is for"
        title="Made for both sides of great work"
        description="One place where people who do the work and people who need it can find each other."
      />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {audiences.map(({ icon: Icon, title, description, points }) => (
          <Card key={title} padding="lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-navy">{title}</h3>
            <p className="mt-1 text-sm text-muted">{description}</p>

            <ul className="mt-5 space-y-3">
              {points.map((point) => (
                <li
                  key={point.text}
                  className="flex items-start gap-3 text-sm text-ink"
                >
                  {point.planned ? (
                    <Clock
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                      aria-hidden="true"
                    />
                  ) : (
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-success-strong"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {point.text}
                    {point.planned ? (
                      <Badge tone="neutral" className="ml-2 align-middle">
                        Planned
                      </Badge>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Section>
  );
}
