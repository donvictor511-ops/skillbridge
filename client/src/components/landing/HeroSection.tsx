import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { paths } from "../../app/paths";
import { Badge, getButtonClasses } from "../ui";
import { HeroOrbitScene } from "./HeroOrbitScene";

const rotatingPhrases = [
  "Find meaningful work.",
  "Get hired for your skills.",
  "Find your next project.",
  "Collaborate with great people.",
  "Grow your professional network.",
];

export function HeroSection(): ReactElement {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const intervalId = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % rotatingPhrases.length);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-page"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 top-8 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -right-40 top-24 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
      </div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:py-20">
        <div className="relative z-10 max-w-2xl">
          <Badge tone="accent">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Your work. Your next opportunity.
          </Badge>

          <h1
            id="hero-heading"
            className="mt-6 text-4xl font-bold tracking-tight text-navy sm:text-5xl lg:text-6xl lg:leading-[1.08]"
          >
            Your next move starts here.
            <span className="mt-2 block min-h-[1.16em] text-brand">
              <span key={phraseIndex} className="hero-rotating-phrase inline-block">
                {rotatingPhrases[phraseIndex]}
              </span>
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Turn your skills into a story people can trust. Showcase real projects,
            discover jobs and collaborations, and grow with a professional community—all
            in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={paths.register}
              className={getButtonClasses({
                variant: "primary",
                size: "lg",
                fullWidth: false,
              })}
            >
              Build your profile
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className={getButtonClasses({
                variant: "secondary",
                size: "lg",
                fullWidth: false,
              })}
            >
              Explore SkillBridge
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-muted">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" /> AI career studio</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand" /> Jobs & projects</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" /> Professional community</span>
          </div>
        </div>

        <HeroOrbitScene />
      </div>
    </section>
  );
}
