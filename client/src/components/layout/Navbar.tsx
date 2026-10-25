import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Link, NavLink } from "react-router";
import { Menu, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { getButtonClasses } from "../ui";
import { Container } from "./Container";

interface NavItem {
  label: string;
  to: string;
}

// Add real pages here as they are built.
const navItems: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Design preview", to: "/design-preview" },
];

const mobileMenuId = "mobile-menu";

function getLinkClasses({ isActive }: { isActive: boolean }): string {
  return cn(
    "inline-flex h-11 items-center rounded-control px-3 text-sm font-medium transition-colors",
    isActive ? "bg-brand/10 text-brand" : "text-ink hover:bg-page",
  );
}

export function Navbar(): ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  function closeMenu(): void {
    setIsOpen(false);
  }

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-control text-lg font-bold text-navy"
          onClick={closeMenu}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm text-white"
          >
            S
          </span>
          SkillBridge
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={getLinkClasses}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            className={getButtonClasses({
              variant: "ghost",
              size: "md",
              fullWidth: false,
            })}
          >
            Log in
          </Link>
          <Link
            to="/register"
            className={getButtonClasses({
              variant: "primary",
              size: "md",
              fullWidth: false,
            })}
          >
            Sign up
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-control text-navy transition-colors hover:bg-page md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls={mobileMenuId}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </Container>

      {isOpen ? (
        <div id={mobileMenuId} className="border-t border-line md:hidden">
          <Container className="py-3">
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={getLinkClasses}
                  onClick={closeMenu}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              <Link
                to="/login"
                onClick={closeMenu}
                className={getButtonClasses({
                  variant: "secondary",
                  size: "md",
                  fullWidth: true,
                })}
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className={getButtonClasses({
                  variant: "primary",
                  size: "md",
                  fullWidth: true,
                })}
              >
                Sign up
              </Link>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
