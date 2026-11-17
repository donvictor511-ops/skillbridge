import { useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, X } from "lucide-react";

import { paths } from "../../app/paths";
import { useCurrentUser } from "../../features/auth/authQueries";
import { cn } from "../../lib/cn";
import { getButtonClasses } from "../ui";
import { primaryNavItems } from "../navigation/navItems";
import { Logo } from "./Logo";

export function PublicHeader(): ReactElement {
  const location = useLocation();
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const { data: user } = useCurrentUser();

  const isOnboarded = Boolean(user?.onboardedAt);

  const visibleNavItems = isOnboarded
    ? [...primaryNavItems, { label: "Discover", to: paths.discover }]
    : primaryNavItems;

  const [openPath, setOpenPath] = useState<string | null>(null);
  const isMenuOpen = openPath === location.pathname;

  function toggleMenu(): void {
    setOpenPath(isMenuOpen ? null : location.pathname);
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpenPath(null);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            to={paths.home}
            aria-label="SkillBridge home"
            className="rounded-control"
          >
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex h-16 items-center border-b-2 px-3 text-sm transition-colors",
                    isActive
                      ? "border-brand font-semibold text-navy"
                      : "border-transparent font-medium text-muted hover:text-navy",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {!user ? (
            <>
              <Link
                to={paths.login}
                className={getButtonClasses({
                  variant: "ghost",
                  size: "md",
                  fullWidth: false,
                })}
              >
                Log in
              </Link>

              <Link
                to={paths.register}
                className={getButtonClasses({
                  variant: "primary",
                  size: "md",
                  fullWidth: false,
                })}
              >
                Get started
              </Link>
            </>
          ) : (
            <Link
              to={isOnboarded ? paths.dashboard : paths.onboarding}
              className={getButtonClasses({
                variant: "primary",
                size: "md",
                fullWidth: false,
              })}
            >
              {isOnboarded ? "Dashboard" : "Complete profile"}
            </Link>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-control text-navy transition-colors hover:bg-page md:hidden"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        id={menuId}
        hidden={!isMenuOpen}
        className="border-t border-line bg-surface md:hidden"
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6"
        >
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center rounded-control border-l-4 px-3 text-base transition-colors",
                  isActive
                    ? "border-brand bg-brand/10 font-semibold text-navy"
                    : "border-transparent font-medium text-ink hover:bg-page",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          <div className="mt-2 grid gap-2 border-t border-line pt-3">
            {!user ? (
              <>
                <Link
                  to={paths.login}
                  className={getButtonClasses({
                    variant: "secondary",
                    size: "md",
                    fullWidth: true,
                  })}
                >
                  Log in
                </Link>

                <Link
                  to={paths.register}
                  className={getButtonClasses({
                    variant: "primary",
                    size: "md",
                    fullWidth: true,
                  })}
                >
                  Get started
                </Link>
              </>
            ) : (
              <Link
                to={isOnboarded ? paths.dashboard : paths.onboarding}
                className={getButtonClasses({
                  variant: "primary",
                  size: "md",
                  fullWidth: true,
                })}
              >
                {isOnboarded ? "Dashboard" : "Complete profile"}
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
