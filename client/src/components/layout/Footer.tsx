import type { ReactElement } from "react";
import { Link } from "react-router";
import { Container } from "./Container";

export function Footer(): ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white/80">
      <Container className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold text-white">SkillBridge</p>
          <p className="mt-1 text-sm">
            Connecting skilled professionals with the people who need them.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link
                to="/"
                className="inline-flex min-h-11 items-center rounded-control underline-offset-4 hover:text-white hover:underline sm:min-h-0"
              >
                Home
              </Link>
            </li>
          </ul>
        </nav>
      </Container>

      <div className="border-t border-white/10">
        <Container className="py-4 text-sm">
          &copy; {year} SkillBridge. All rights reserved.
        </Container>
      </div>
    </footer>
  );
}
