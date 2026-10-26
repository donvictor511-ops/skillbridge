import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import { FolderOpen, Layers, ShieldCheck, Users } from "lucide-react";
import { Card } from "../ui";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: FolderOpen,
    title: "Portfolio-first profiles",
    description:
      "Add projects that prove what you can do, so your profile is more than a list of claims.",
  },
  {
    icon: Layers,
    title: "Skills with context",
    description:
      "Connect each skill to the work behind it, so visitors can see how you use it.",
  },
  {
    icon: Users,
    title: "Built for both sides",
    description:
      "Professionals and clients each get a profile and tools designed for them.",
  },
  {
    icon: ShieldCheck,
    title: "Trust and privacy first",
    description:
      "You control what is public. Security and honesty are built in from day one, and we never show a verification badge that was not earned.",
  },
];

export function FeaturesSection(): ReactElement {
  return (
    <Section labelledBy="features-heading" id="features" tone="surface">
      <SectionHeading
        id="features-heading"
        eyebrow="What you get"
        title="A profile that shows, not just tells"
        description="The foundation of SkillBridge is simple: real work, clearly presented."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title} padding="lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-navy">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-navy">{title}</h3>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
