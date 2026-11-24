import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, Check } from "lucide-react";
import { Card } from "../ui";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

interface AudiencePoint {
  text: string;
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
      { text: "Use AI career support to plan your next step" },
      { text: "Connect, message, and share your work with the community" },
    ],
  },
  {
    icon: Building2,
    title: "For clients and businesses",
    description:
      "Startups, companies, and individuals who need skilled people.",
    points: [
      { text: "Create a business profile and present your work" },
      { text: "Publish jobs and projects for skilled professionals" },
      { text: "Find people, connect, and start a conversation" },
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
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-success-strong"
                    aria-hidden="true"
                  />
                  <span>{point.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Section>
  );
}
