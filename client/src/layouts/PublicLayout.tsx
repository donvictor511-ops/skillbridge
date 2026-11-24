import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Outlet, useLocation } from "react-router";
import { PublicHeader } from "../components/layout/PublicHeader";
import { CallInviteListener } from "../features/calls/CallInviteListener";
import { useCurrentUser } from "../features/auth/authQueries";
import { NavigationProgress } from "../components/layout/NavigationProgress";
import { CallSessionPage } from "../features/calls/CallSessionPage";
import { paths } from "../app/paths";

export default function PublicLayout(): ReactElement {
  const location = useLocation();
  const isMessagesRoute = location.pathname === "/messages";
  const routeCallId = location.pathname.startsWith(`${paths.calls}/`) ? decodeURIComponent(location.pathname.slice(paths.calls.length + 1)) : null;
  const [activeCallId, setActiveCallId] = useState<string | null>(routeCallId);
  const { data: user } = useCurrentUser();
  const hasMobileNav = Boolean(user?.onboardedAt);

  useEffect(() => {
    if (routeCallId) setActiveCallId(routeCallId);
  }, [routeCallId]);

  return (
    <div className={isMessagesRoute ? "flex h-[100dvh] flex-col overflow-hidden" : "flex min-h-screen flex-col"}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-brand focus:shadow-card"
      >
        Skip to main content
      </a>

      <div className="h-[3.75rem] shrink-0">
        <PublicHeader />
      </div>
      <NavigationProgress />
      <CallInviteListener />

      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 focus:outline-none ${isMessagesRoute ? "flex min-h-0 flex-col overflow-hidden" : ""}`}
      >
        <Outlet />
      </main>
      <div aria-hidden="true" className={hasMobileNav ? "h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 lg:hidden" : "hidden"} />
      {activeCallId ? <CallSessionPage key={activeCallId} callId={activeCallId} minimized={routeCallId !== activeCallId} onEnd={() => setActiveCallId(null)} /> : null}
    </div>
  );
}
