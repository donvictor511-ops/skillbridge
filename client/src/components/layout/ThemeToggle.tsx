import type { ReactElement } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../app/ThemeContext";

export function ThemeToggle(): ReactElement {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${nextTheme} mode`}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink transition-colors hover:bg-page focus-visible:ring-2 focus-visible:ring-brand"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
      <span className="sr-only">{nextTheme === "dark" ? "Enable dark mode" : "Enable light mode"}</span>
    </button>
  );
}
