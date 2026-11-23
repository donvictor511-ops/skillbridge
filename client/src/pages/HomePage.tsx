import type { ReactElement } from "react";
import { Navigate } from "react-router";

import { paths } from "../app/paths";
import { useCurrentUser } from "../features/auth/authQueries";
import LandingPage from "./LandingPage";
import { Spinner } from "../components/ui/Spinner";
import { ErrorMessage } from "../components/ui/ErrorMessage";

export default function HomePage(): ReactElement {
  const { data: user, isPending, isError, refetch } = useCurrentUser();

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Checking your account" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorMessage
          title="Couldn't check your account"
          message="Please check your connection and try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (user?.onboardedAt) {
    return <Navigate to={paths.posts} replace />;
  }

  if (user) {
    return <Navigate to={paths.onboarding} replace />;
  }

  return <LandingPage />;
}
