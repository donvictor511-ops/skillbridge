import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  BriefcaseBusiness,
  FolderOpen,
  MessagesSquare,
  Users,
} from "lucide-react";
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
    icon: BrainCircuit,
    title: "AI Career Studio",
    description:
      "Get practical help with your profile, career direction, writing, and relevant opportunities.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Jobs and projects",
    description:
      "Explore opportunities, publish projects, and connect with people ready to do the work.",
  },
  {
    icon: MessagesSquare,
    title: "Community that moves work forward",
    description:
      "Share updates, join professional communities, and message collaborators directly.",
  },
  {
    icon: Users,
    title: "Built for both sides",
    description:
      "Professionals and clients each get profiles and tools made for their goals.",
  },
];

export function FeaturesSection(): ReactElement {
  return (
    <Section labelledBy="features-heading" id="features" tone="surface">
      <SectionHeading
        id="features-heading"
        eyebrow="What you get"
        title="Everything you need to build momentum"
        description="From your first portfolio project to your next collaboration, SkillBridge brings your professional journey together."
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
