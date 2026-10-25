import type { ReactElement } from "react";
import { Outlet } from "react-router";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function MainLayout(): ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Lets keyboard users jump past the navigation. */}
      <a
        href="#main-content"
        className="sr-only rounded-control bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
