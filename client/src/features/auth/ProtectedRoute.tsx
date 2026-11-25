import type { ReactElement } from "react";
import axios from "axios";
import { Navigate, Outlet, useLocation } from "react-router";
import { paths } from "../../app/paths";
import { ErrorMessage, Spinner } from "../../components/ui";
import { useCurrentUser } from "./authQueries";

// A layout route that only shows its children to logged-in users.
// This is for a better experience only. The REAL protection is the server,
// which checks the session on every protected API request.
export function ProtectedRoute(): ReactElement {
  const location = useLocation();
  const { data: user, isPending, isError, error, refetch } = useCurrentUser();

  if (isPending) {
    return (
      <div className="flex justify-center px-4 py-24 text-brand">
        <Spinner size="lg" label="Checking your session" />
      </div>
    );
  }

  // We could not find out (for example, the server is down).
  // That is NOT the same as "logged out", so we do not redirect.
  // Keep the current page mounted if we already know the user and the network
  // temporarily fails. That preserves local page state (including open forms).
  const temporaryConnectionFailure = isError && Boolean(user) && (
    !axios.isAxiosError(error) || !error.response || error.response.status >= 500
  );
  if (isError && !temporaryConnectionFailure) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorMessage
          message="We could not check your login. Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to={paths.login} replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
