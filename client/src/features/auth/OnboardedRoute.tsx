import type { ReactElement } from "react";
import { Navigate, Outlet } from "react-router";
import { paths } from "../../app/paths";
import { useCurrentUser } from "./authQueries";

// Goes INSIDE ProtectedRoute. Pages in this group need a finished setup.
// If the person has not finished onboarding, we send them there first.
export function OnboardedRoute(): ReactElement {
  const { data: user } = useCurrentUser();

  if (user && !user.onboardedAt) {
    return <Navigate to={paths.onboarding} replace />;
  }

  return <Outlet />;
}
