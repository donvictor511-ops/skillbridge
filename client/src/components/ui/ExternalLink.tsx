import type { ReactElement, ReactNode } from "react";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { isSafeHttpsUrl } from "../../lib/url";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

// A link to another website, opened in a new tab.
// We draw it as a link ONLY if it is a normal https address. Anything else
// (even if it somehow reached the database) is shown as plain text.
export function ExternalLink({
  href,
  children,
  className,
}: ExternalLinkProps): ReactElement {
  if (!isSafeHttpsUrl(href)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 rounded-control font-semibold text-brand underline underline-offset-4 hover:text-brand-hover",
        className,
      )}
    >
      {children}
      <ExternalLinkIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
