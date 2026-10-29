import type { ReactElement } from "react";
import { Badge, Button, ErrorMessage } from "../components/ui";
import { useCurrentUser, useLogout } from "../features/auth/authQueries";
import { capabilityOptions } from "../features/onboarding/onboardingOptions";

// TEMPORARY content: this page only proves that protected routes work.
// The real dashboard is built later.
export default function DashboardPage(): ReactElement {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  const accountTypes =
    user?.capabilities
      .map(
        (capability) =>
          capabilityOptions.find((option) => option.value === capability)
            ?.label ?? capability,
      )
      .join(" and ") ?? "";

  function handleLogout(): void {
    // After logging out, ProtectedRoute notices there is no user and
    // sends the visitor to the login page by itself.
    logoutMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Badge tone="warning">Temporary page</Badge>
      <h1 className="mt-3 text-2xl font-bold text-navy sm:text-3xl">
        Dashboard
      </h1>
      <p className="mt-3 text-muted">
        Signed in as{" "}
        <span className="font-semibold text-ink">{user?.email}</span>
      </p>
      <p className="mt-1 text-muted">
        Account type:{" "}
        <span className="font-semibold text-ink">{accountTypes}</span>
      </p>
      <p className="mt-2 text-sm text-muted">
        The real dashboard comes later. This page only proves that protected
        routes and onboarding work.
      </p>

      {logoutMutation.isError ? (
        <ErrorMessage
          className="mt-6"
          message="We could not log you out. Please try again."
        />
      ) : null}

      <div className="mt-6">
        <Button
          variant="secondary"
          loading={logoutMutation.isPending}
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
