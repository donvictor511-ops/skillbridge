import type { ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router";
import { Check } from "lucide-react";

interface CheckItem {
  label: string;
  detail: string;
}

// TEMPORARY page: it only proves the tools are connected.
// We remove it when the real landing page is built in Part 2.
export default function SetupCheckPage(): ReactElement {
  const location = useLocation();

  // This hook throws an error if QueryClientProvider is missing,
  // so calling it proves the provider is connected.
  useQueryClient();

  const apiBaseUrl: string =
    import.meta.env.VITE_API_BASE_URL || "Not set (create client/.env)";

  const items: CheckItem[] = [
    {
      label: "React + TypeScript",
      detail: "This page is a typed React component.",
    },
    {
      label: "Tailwind CSS",
      detail: "The layout, colors, and spacing come from Tailwind classes.",
    },
    {
      label: "React Router",
      detail: `Current path: ${location.pathname}`,
    },
    {
      label: "TanStack Query",
      detail: "The query client provider is connected.",
    },
    {
      label: "Environment variables",
      detail: `API base URL: ${apiBaseUrl}`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
        <p className="inline-block rounded-full border border-[#14B8A6] bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold text-[#14213D]">
          Temporary setup check
        </p>

        <h1 className="mt-4 text-2xl font-bold text-[#14213D] sm:text-3xl">
          SkillBridge client is running
        </h1>
        <p className="mt-2 text-[#64748B]">
          If you can read this with styling, the foundation works. This page
          will be replaced by the real landing page in Part 2.
        </p>

        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#14B8A6] text-white">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[#14213D]">{item.label}</p>
                <p className="break-words text-sm text-[#64748B]">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
