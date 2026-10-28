import type { ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { getSafeRedirectPath } from "./redirect";
import { useCurrentUser } from "./authQueries";

// The opposite of ProtectedRoute: for pages only logged-out visitors need
// (login, register). A logged-in person is sent on to where they were going.
// While we are still checking, we show the form right away, because most
// visitors here are logged out and should not wait for a spinner.
export function GuestRoute(): ReactElement {
  const location = useLocation();
  const { data: user } = useCurrentUser();

  if (user) {
    return <Navigate to={getSafeRedirectPath(location.state)} replace />;
  }

  return <Outlet />;
}
