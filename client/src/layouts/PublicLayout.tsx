import type { ReactElement } from "react";
import { Outlet } from "react-router";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PublicHeader } from "../components/layout/PublicHeader";

export default function PublicLayout(): ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-brand focus:shadow-card"
      >
        Skip to main content
      </a>

      <PublicHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}
