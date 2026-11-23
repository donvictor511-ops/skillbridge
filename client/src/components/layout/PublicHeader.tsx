import { useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, X, House, Compass, BriefcaseBusiness, MessageCircle, UsersRound, MoreHorizontal, FolderKanban, Sparkles, UserRound, Shield, LayoutDashboard } from "lucide-react";

import { paths } from "../../app/paths";
import { useCurrentUser } from "../../features/auth/authQueries";
import { useConnections } from "../../features/connections/connectionsQueries";
import { NotificationBell } from "../../features/notifications/NotificationBell";
import { useUnreadMessages } from "../../features/messages/messagesQueries";
import { useMessagingEvents } from "../../features/messages/useMessagingEvents";
import { cn } from "../../lib/cn";
import { getButtonClasses } from "../ui";
import { primaryNavItems } from "../navigation/navItems";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearchBox } from "../../features/search/GlobalSearchBox";

const desktopNavItems = [
  { label: "Feed", to: paths.posts, icon: House },
  { label: "Discover", to: paths.discover, icon: Compass },
  { label: "Jobs", to: paths.jobs, icon: BriefcaseBusiness },
];

function ConnectionsNavLink({
  mobile = false,
  bottom = false,
  onNavigate,
}: {
  mobile?: boolean;
  bottom?: boolean;
  onNavigate?: () => void;
}): ReactElement {
  const { data: connections } = useConnections();

  const pendingIncomingCount =
    connections?.filter(
      (connection) =>
        connection.status === "pending" && connection.direction === "incoming",
    ).length ?? 0;

  return (
    <NavLink
      to={paths.connections}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          bottom
            ? "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] transition-colors"
            : mobile
            ? "flex h-11 items-center justify-between rounded-control border-l-4 px-3 text-base transition-colors"
            : "inline-flex h-12 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors",
          isActive
            ? mobile
              ? "border-brand bg-brand/10 font-semibold text-navy"
              : "bg-brand/10 font-semibold text-navy"
            : mobile
              ? "border-transparent font-medium text-ink hover:bg-page"
              : "font-medium text-muted hover:bg-page hover:text-navy",
        )
      }
    >
      {!mobile || bottom ? <UsersRound className={bottom ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" /> : null}
      <span>{bottom ? "Network" : mobile ? "Connections" : "Network"}</span>

      {pendingIncomingCount > 0 && (
        <span
          role="status"
          aria-label={`${pendingIncomingCount} pending connection requests`}
          className={cn("inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white", bottom && "absolute right-2 top-0 min-w-4 px-1 text-[9px]")}
        >
          {pendingIncomingCount > 9 ? "9+" : pendingIncomingCount}
        </span>
      )}
    </NavLink>
  );
}

function MessagesNavLink({ mobile = false, bottom = false, onNavigate }: { mobile?: boolean; bottom?: boolean; onNavigate?: () => void }): ReactElement {
  const { data: unread = 0 } = useUnreadMessages();
  return <NavLink to={paths.messages} onClick={onNavigate} className={({ isActive }) => cn(bottom ? "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] transition-colors" : mobile ? "flex h-11 items-center justify-between rounded-control border-l-4 px-3 text-base" : "inline-flex h-12 items-center gap-1.5 rounded-lg px-2 text-xs", isActive ? "border-brand bg-brand/10 font-semibold text-navy" : "border-transparent font-medium text-muted hover:bg-page hover:text-navy")}>
    {!mobile || bottom ? <MessageCircle className={bottom ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" /> : null}<span>{bottom ? "Messages" : "Messages"}</span>{unread > 0 && <span className={cn("rounded-full bg-brand px-2 py-0.5 text-xs text-white", bottom && "absolute right-2 top-0 min-w-4 px-1 text-[9px]")}>{unread > 9 ? "9+" : unread}</span>}
  </NavLink>;
}

export function PublicHeader(): ReactElement {
  const location = useLocation();
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMoreMenuRef = useRef<HTMLDivElement>(null);

  const { data: user } = useCurrentUser();

  const isOnboarded = Boolean(user?.onboardedAt);
  useMessagingEvents(isOnboarded);

  const visibleNavItems = isOnboarded
    ? [
        { label: "Feed", to: paths.posts },
        { label: "Discover", to: paths.discover },
        { label: "Community", to: paths.communities },
        { label: "Jobs", to: paths.jobs },
        { label: "Projects", to: paths.projects },
        { label: "AI Studio", to: paths.aiCareer },
        { label: "My Profile", to: paths.myProfile },
        ...(user?.role === "admin" ? [{ label: "Admin", to: paths.admin }] : []),
      ]
    : [...primaryNavItems, { label: "Community guidelines", to: paths.guidelines }];

  const [openPath, setOpenPath] = useState<string | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isMenuOpen = openPath === location.pathname;
  const isMoreRouteActive = [paths.communities, paths.projects, paths.aiCareer, paths.myProfile, paths.guidelines, paths.admin].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  function toggleMenu(): void {
    setOpenPath(isMenuOpen ? null : location.pathname);
  }

  function closeMenu(): void {
    setOpenPath(null);
    setIsMoreOpen(false);
  }

  useEffect(() => {
    if (!isMenuOpen && !isMoreOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpenPath(null);
        setIsMoreOpen(false);
        if (isMenuOpen) menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, isMoreOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node) && !mobileMoreMenuRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isMoreOpen]);

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-[3.75rem] max-w-screen-2xl items-center gap-3 px-3 sm:px-5 xl:gap-5">
        {/* Logo */}
        <div className="flex min-w-0 flex-1 items-center gap-3 xl:gap-5">
          <Link
            to={paths.home}
            aria-label="SkillBridge home"
            className="rounded-control"
            onClick={closeMenu}
          >
            <Logo />
          </Link>

          {isOnboarded ? <GlobalSearchBox /> : null}

          {/* Desktop navigation */}
      <nav aria-label="Main" className="ml-auto hidden shrink-0 items-center gap-0.5 lg:flex">
            {isOnboarded ? desktopNavItems.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => cn("flex h-12 min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium transition-colors", isActive ? "text-navy" : "text-muted hover:bg-page hover:text-navy")}><Icon className="h-[18px] w-[18px]" />{label}</NavLink>) : visibleNavItems.map((item) => <NavLink key={item.to} to={item.to} onClick={closeMenu} end={item.end} className={({ isActive }) => cn("inline-flex h-11 items-center rounded-lg px-3 text-sm", isActive ? "font-semibold text-navy" : "text-muted hover:bg-page hover:text-navy")}>{item.label}</NavLink>)}
            {isOnboarded ? <ConnectionsNavLink /> : null}
            {isOnboarded ? <MessagesNavLink /> : null}
            {isOnboarded ? <div ref={moreMenuRef} className="relative">
              <button type="button" aria-expanded={isMoreOpen} onClick={() => setIsMoreOpen((open) => !open)} className={cn("flex h-12 min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium text-muted hover:bg-page hover:text-navy", (isMoreOpen || isMoreRouteActive) && "bg-page text-navy")}><MoreHorizontal className="h-[18px] w-[18px]" />More</button>
              {isMoreOpen ? <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-line bg-surface p-2 shadow-card">{[
                { label: "Communities", to: paths.communities, icon: UsersRound }, { label: "Projects", to: paths.projects, icon: FolderKanban }, { label: "AI Studio", to: paths.aiCareer, icon: Sparkles }, { label: "My profile", to: paths.myProfile, icon: UserRound }, { label: "Community guidelines", to: paths.guidelines, icon: Shield }, ...(user?.role === "admin" ? [{ label: "Admin", to: paths.admin, icon: Shield }] : []),
              ].map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setIsMoreOpen(false)} className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", isActive ? "bg-brand/10 font-semibold text-navy" : "text-ink hover:bg-page")}><Icon className="h-4 w-4 text-brand" />{label}</NavLink>)}</div> : null}
            </div> : null}
          </nav>
        </div>

        {/* Desktop actions */}
        <div className="ml-auto hidden shrink-0 items-center gap-1 lg:flex lg:ml-0">
          <ThemeToggle />
          {user && isOnboarded && <NotificationBell />}

          {!user ? (
            <>
              <Link
                to={paths.login}
                className={getButtonClasses({
                  variant: "ghost",
                  size: "sm",
                  fullWidth: false,
                })}
              >
                Log in
              </Link>

              <Link
                to={paths.register}
                className={getButtonClasses({
                  variant: "primary",
                  size: "sm",
                  fullWidth: false,
                })}
              >
                Get started
              </Link>
            </>
          ) : (
            <Link
              to={isOnboarded ? paths.dashboard : paths.onboarding}
              className={getButtonClasses({
                variant: "primary",
              size: "sm",
                fullWidth: false,
              })}
            >
              {isOnboarded ? "Dashboard" : "Complete profile"}
            </Link>
          )}
        </div>

        {/* Mobile actions */}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          {isOnboarded ? <GlobalSearchBox compact /> : null}
          <ThemeToggle />
          {user && isOnboarded && <NotificationBell />}

          {!isOnboarded ? <button
            ref={menuButtonRef}
            type="button"
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-control text-navy transition-colors hover:bg-page"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button> : null}
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        id={menuId}
        hidden={!isMenuOpen}
        className="max-h-[calc(100dvh-3.75rem)] overflow-y-auto border-t border-line bg-surface lg:hidden"
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex max-w-screen-2xl flex-col gap-1 px-4 py-3 sm:px-6"
        >
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center rounded-control border-l-4 px-3 text-base transition-colors",
                  isActive
                    ? "border-brand bg-brand/10 font-semibold text-navy"
                    : "border-transparent font-medium text-ink hover:bg-page",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          {/* Mobile connections link */}
          {isOnboarded && <ConnectionsNavLink mobile onNavigate={closeMenu} />}
          {isOnboarded && <MessagesNavLink mobile onNavigate={closeMenu} />}
          {isOnboarded ? <NavLink to={paths.guidelines} onClick={closeMenu} className={({ isActive }) => cn("flex h-11 items-center rounded-control border-l-4 px-3 text-base", isActive ? "border-brand bg-brand/10 font-semibold text-navy" : "border-transparent font-medium text-ink hover:bg-page")}>Community guidelines</NavLink> : null}

          {/* Mobile authentication actions */}
          <div className="mt-2 grid gap-2 border-t border-line pt-3">
            {!user ? (
              <>
                <Link
                  to={paths.login}
                  onClick={closeMenu}
                  className={getButtonClasses({
                    variant: "secondary",
                    size: "md",
                    fullWidth: true,
                  })}
                >
                  Log in
                </Link>

                <Link
                  to={paths.register}
                  onClick={closeMenu}
                  className={getButtonClasses({
                    variant: "primary",
                    size: "md",
                    fullWidth: true,
                  })}
                >
                  Get started
                </Link>
              </>
            ) : (
              <Link
                to={isOnboarded ? paths.dashboard : paths.onboarding}
                onClick={closeMenu}
                className={getButtonClasses({
                  variant: "primary",
                  size: "md",
                  fullWidth: true,
                })}
              >
                {isOnboarded ? "Dashboard" : "Complete profile"}
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
    {isOnboarded ? <nav aria-label="Mobile primary navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex h-16 max-w-screen-sm items-stretch justify-around px-1">
        {desktopNavItems.slice(0, 2).map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px]", isActive ? "font-semibold text-brand" : "text-muted hover:bg-page hover:text-navy")}><Icon className="h-5 w-5" aria-hidden="true" /><span>{label}</span></NavLink>)}
        <ConnectionsNavLink bottom onNavigate={closeMenu} />
        <MessagesNavLink bottom onNavigate={closeMenu} />
        <div ref={mobileMoreMenuRef} className="relative flex min-w-0 flex-1">
          <button type="button" aria-expanded={isMoreOpen} onClick={() => setIsMoreOpen((open) => !open)} className={cn("flex w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px]", (isMoreOpen || isMoreRouteActive) ? "font-semibold text-brand" : "text-muted hover:bg-page hover:text-navy")}><MoreHorizontal className="h-5 w-5" aria-hidden="true" /><span>More</span></button>
          {isMoreOpen ? <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 grid w-56 grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-card">{[
            { label: "Dashboard", to: paths.dashboard, icon: LayoutDashboard }, { label: "Communities", to: paths.communities, icon: UsersRound }, { label: "Jobs", to: paths.jobs, icon: BriefcaseBusiness }, { label: "Projects", to: paths.projects, icon: FolderKanban }, { label: "AI Studio", to: paths.aiCareer, icon: Sparkles }, { label: "My profile", to: paths.myProfile, icon: UserRound }, ...(user?.role === "admin" ? [{ label: "Admin", to: paths.admin, icon: Shield }] : []), { label: "Guidelines", to: paths.guidelines, icon: Shield },
          ].map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setIsMoreOpen(false)} className={({ isActive }) => cn("flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center text-[11px]", isActive ? "bg-brand/10 font-semibold text-brand" : "text-ink hover:bg-page")}><Icon className="h-4 w-4" aria-hidden="true" />{label}</NavLink>)}</div> : null}
        </div>
      </div>
    </nav> : null}
    </>
  );
}
