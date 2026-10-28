import type { ReactElement, ReactNode } from "react";
import { Card } from "../../components/ui";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  // Shown under the card, for example "New here? Create an account".
  footer: ReactNode;
}

// The frame shared by the login and register pages.
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps): ReactElement {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <Card padding="lg">
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </Card>
      <p className="mt-6 text-center text-sm text-muted">{footer}</p>
    </div>
  );
}
