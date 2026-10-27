import type { ReactElement } from "react";
import { Link } from "react-router";
import { footerLinkGroups } from "../navigation/navItems";
import { Logo } from "./Logo";

export function PublicFooter(): ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white" data-surface="dark">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo tone="inverse" />
            <p className="mt-3 max-w-sm text-sm text-white/80">
              Show your skills through real work, build your professional
              network, and find the people and opportunities that fit you.
            </p>
          </div>

          {footerLinkGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold text-white">
                {group.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="rounded-control text-sm text-white/80 transition-colors hover:text-white hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 border-t border-white/15 pt-6 text-sm text-white/70">
          © {year} SkillBridge. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
