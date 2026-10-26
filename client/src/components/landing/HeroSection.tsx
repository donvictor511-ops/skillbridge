import type { ReactElement } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { paths } from "../../app/paths";
import { Badge, getButtonClasses } from "../ui";
import { ProfilePreviewCard } from "./ProfilePreviewCard";

export function HeroSection(): ReactElement {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-linear-to-b from-surface to-page"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <Badge tone="accent">
            For professionals, clients, and businesses
          </Badge>

          <h1
            id="hero-heading"
            className="mt-5 text-4xl font-bold tracking-tight text-navy sm:text-5xl"
          >
            Prove your skills with real work.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted">
            SkillBridge connects professionals with the people who need them.
            Build a profile backed by portfolio projects, so your work speaks
            for you.
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
              Get started
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
              See how it works
            </a>
          </div>
        </div>

        <ProfilePreviewCard />
      </div>
    </section>
  );
}
