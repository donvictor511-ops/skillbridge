import type { ReactElement, ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import { Logo } from "../../components/layout/Logo";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  // Shown under the card, for example "New here? Create an account".
  footer: ReactNode;
}

// The shared auth frame keeps the form focused and gives new members a clear
// introduction to the platform without overwhelming smaller screens.
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps): ReactElement {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 lg:py-16">
      <div className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_24px_80px_-38px_rgba(20,33,61,0.38)] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative isolate hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-navy via-[#203a66] to-brand p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div aria-hidden="true" className="absolute -right-24 -top-20 -z-10 h-80 w-80 rounded-full border border-white/10 bg-white/[0.04]" />
          <div aria-hidden="true" className="absolute -bottom-32 -left-24 -z-10 h-96 w-96 rounded-full border border-white/10 bg-white/[0.04]" />
          <div>
            <Logo tone="inverse" />
            <div className="mt-20 max-w-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
                <Sparkles className="h-3.5 w-3.5 text-teal-200" aria-hidden="true" />
                YOUR NEXT CHAPTER STARTS HERE
              </span>
              <h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight xl:text-[2.75rem]">
                Turn your skills into real opportunities.
              </h2>
              <p className="mt-4 text-base leading-7 text-blue-100/90">
                Meet people who value your work, find meaningful projects, and build a profile that moves with you.
              </p>
            </div>
            <ul className="mt-8 space-y-4 text-sm text-white/90">
              {["Showcase the work you are proud of", "Find collaborators and new opportunities", "Grow with a community built around skills"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-300/15 text-teal-200">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between border-t border-white/15 pt-5 text-xs text-blue-100/75">
            <span>A community for people who make things happen.</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </div>
        </aside>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">SkillBridge account</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">{title}</h1>
            <p className="mt-3 text-base leading-6 text-muted">{description}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">{footer}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
