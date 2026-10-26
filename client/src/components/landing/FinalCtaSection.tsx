import type { ReactElement } from "react";
import { Link } from "react-router";
import { paths } from "../../app/paths";
import { getButtonClasses } from "../ui";
import { Section } from "./Section";

export function FinalCtaSection(): ReactElement {
  return (
    <Section labelledBy="cta-heading">
      <div className="rounded-3xl bg-navy px-6 py-12 text-center sm:px-12 sm:py-16">
        <h2
          id="cta-heading"
          className="text-2xl font-bold text-white sm:text-3xl"
        >
          Ready to show your work?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/80">
          Create your SkillBridge profile and let your projects speak for you.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={paths.register}
            className={getButtonClasses({
              variant: "secondary",
              size: "lg",
              fullWidth: false,
            })}
          >
            Create your account
          </Link>
          <Link
            to={paths.login}
            className="rounded-control px-3 py-2 text-sm font-semibold text-white underline underline-offset-4 hover:text-white/80"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </Section>
  );
}
