import type { ReactElement } from "react";
import { Badge, Card } from "../ui";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

interface PlannedItem {
  title: string;
  description: string;
}

const plannedItems: PlannedItem[] = [
  {
    title: "Professional network",
    description:
      "Discover people, send connection requests, and share posts about your work.",
  },
  {
    title: "Jobs and projects",
    description:
      "Search listings, apply with a proposal, and manage applicants.",
  },
  {
    title: "Messaging and collaboration",
    description:
      "Talk directly with people and work together in shared project spaces.",
  },
  {
    title: "Optional AI help",
    description:
      "Drafting help that you review and edit. It will never invent your experience or qualifications.",
  },
];

export function PlannedSection(): ReactElement {
  return (
    <Section labelledBy="planned-heading" tone="surface">
      <SectionHeading
        id="planned-heading"
        eyebrow="What is next"
        title="Growing step by step"
        description="We are building SkillBridge in careful stages. These features are planned, and none of them are available yet."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {plannedItems.map((item) => (
          <Card key={item.title} padding="lg">
            <Badge tone="neutral">Planned</Badge>
            <h3 className="mt-3 text-lg font-semibold text-navy">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{item.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
