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
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const { data: user } = useCurrentUser();
  const hasMobileNav = Boolean(user?.onboardedAt);

  useEffect(() => {
    if (routeCallId) setActiveCallId(routeCallId);
  }, [routeCallId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
      {!isOnline ? <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">You’re offline. Stay on this page; it will reconnect when your internet returns.</div> : null}
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
