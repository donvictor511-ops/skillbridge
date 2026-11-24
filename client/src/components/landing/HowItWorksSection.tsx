import type { ReactElement } from "react";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

interface Step {
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    title: "Create your account",
    description:
      "Sign up as a professional, or as a client or business. You can add the other later.",
  },
  {
    title: "Build your profile",
    description:
      "Add your story, skills, and portfolio projects so people can see what you bring.",
  },
  {
    title: "Share your work",
    description:
      "Meet your community, explore opportunities, and start meaningful conversations.",
  },
];

export function HowItWorksSection(): ReactElement {
  return (
    <Section id="how-it-works" labelledBy="how-it-works-heading">
      <SectionHeading
        id="how-it-works-heading"
        eyebrow="How it works"
        title="From sign-up to a profile you are proud of"
        description="Three simple steps."
      />

      <ol className="mt-10 grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-base font-bold text-white"
            >
              {index + 1}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-navy">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
