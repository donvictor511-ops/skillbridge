import type { ReactElement } from "react";
import { Link } from "react-router";
import {
  Users,
  UserPlus,
  UserCheck,
  Send,
  ArrowRight,
  Pencil,
  Eye,
  MapPin,
  BriefcaseBusiness,
  GraduationCap,
  FolderKanban,
} from "lucide-react";

import { paths } from "../app/paths";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorMessage,
  getButtonClasses,
} from "../components/ui";

import { useCurrentUser, useLogout } from "../features/auth/authQueries";
import { AccountAppealForm } from "../features/auth/AccountAppealForm";
import { capabilityOptions } from "../features/onboarding/onboardingOptions";
import { useMyProfile } from "../features/profiles/profileQueries";
import { useConnections } from "../features/connections/connectionsQueries";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function DashboardPage(): ReactElement {
  useDocumentTitle("Dashboard | SkillBridge");

  const { data: user } = useCurrentUser();
  const profileQuery = useMyProfile();
  const connectionsQuery = useConnections();
  const logoutMutation = useLogout();

  const profile = profileQuery.data;
  const connections = connectionsQuery.data ?? [];

  const acceptedConnections = connections.filter(
    (connection) => connection.status === "accepted",
  );

  const incomingRequests = connections.filter(
    (connection) =>
      connection.status === "pending" && connection.direction === "incoming",
  );

  const outgoingRequests = connections.filter(
    (connection) =>
      connection.status === "pending" && connection.direction === "outgoing",
  );

  const latestConnections = [...acceptedConnections]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 3);

  const latestIncomingRequests = [...incomingRequests]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 3);

  const profileChecklist = profile
    ? [
        Boolean(profile.headline?.trim()),
        Boolean(profile.location?.trim()),
        Boolean(profile.bio?.trim()),
        Boolean(profile.avatarUrl),
        profile.skills.length > 0,
        profile.experiences.length > 0,
        profile.education.length > 0,
        profile.projects.length > 0,
      ]
    : [];

  const completedProfileItems = profileChecklist.filter(Boolean).length;
  const profileCompletion = Math.round((completedProfileItems / 8) * 100);

  const accountTypes =
    user?.capabilities
      .map(
        (capability) =>
          capabilityOptions.find((option) => option.value === capability)
            ?.label ?? capability,
      )
      .join(" and ") ?? "";

  function handleLogout(): void {
    logoutMutation.mutate();
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">
              Your professional space
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              Welcome back
              {profile?.displayName ? `, ${profile.displayName}` : ""}
            </h1>

            <p className="mt-2 text-sm text-muted">
              Manage your profile, grow your network, and keep track of your
              connections.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={paths.myProfile}
              className={getButtonClasses({
                variant: "secondary",
                size: "md",
                fullWidth: false,
              })}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              My profile
            </Link>

            <Button
              variant="secondary"
              loading={logoutMutation.isPending}
              onClick={handleLogout}
            >
              Log out
            </Button>
          </div>
        </header>

        {logoutMutation.isError && (
          <ErrorMessage
            className="mb-6"
            message="We could not log you out. Please try again."
          />
        )}

        {profileQuery.isError && (
          <ErrorMessage
            className="mb-6"
            title="Could not load your profile"
            message="Your dashboard is available, but profile information could not be loaded."
            onRetry={() => {
              void profileQuery.refetch();
            }}
          />
        )}

        {connectionsQuery.isError && (
          <ErrorMessage
            className="mb-6"
            title="Could not load your connections"
            message="Connection statistics are temporarily unavailable. Please try again."
            onRetry={() => {
              void connectionsQuery.refetch();
            }}
          />
        )}

        {user?.restrictedUntil && new Date(user.restrictedUntil) > new Date() ? (
          <Card role="status" className="mb-6 border-warning/30">
            <h2 className="font-semibold text-navy">Your account is temporarily restricted</h2>
            <p className="mt-1 text-sm text-muted">You can use the account until {new Date(user.restrictedUntil).toLocaleString()}, but some actions are disabled.</p>
            {user.restrictionReason ? <p className="mt-2 text-sm text-ink"><span className="font-semibold">Reason:</span> {user.restrictionReason}</p> : null}
            <AccountAppealForm defaultEmail={user.email} />
          </Card>
        ) : null}

        {profile && (
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Link to={paths.myProfile} aria-label="View your profile" className="shrink-0 rounded-full">
                <Avatar name={profile.displayName} src={profile.avatarUrl ?? undefined} size="xl" />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-navy">
                    {profile.displayName}
                  </h2>

                  <Badge tone="brand">
                    {accountTypes || "SkillBridge member"}
                  </Badge>
                </div>

                <p className="mt-1 text-sm text-muted">
                  {profile.headline ||
                    "Add a professional headline to your profile."}
                </p>

                {profile.location && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {profile.location}
                  </p>
                )}
              </div>

              <Link
                to={paths.editProfile}
                className={getButtonClasses({
                  variant: "primary",
                  size: "md",
                  fullWidth: false,
                })}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit profile
              </Link>
            </div>
          </Card>
        )}

        <section className="mt-8" aria-labelledby="overview-heading">
          <div className="mb-4">
            <h2
              id="overview-heading"
              className="text-lg font-semibold text-navy"
            >
              Network overview
            </h2>

            <p className="mt-1 text-sm text-muted">
              An overview of your professional connections.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Accepted connections</p>

                  <p className="mt-2 text-3xl font-bold text-navy">
                    {connectionsQuery.isPending
                      ? "—"
                      : acceptedConnections.length}
                  </p>
                </div>

                <div className="rounded-xl bg-brand/10 p-3 text-brand">
                  <UserCheck className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <Link
                to={paths.connections}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
              >
                View connections
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Incoming requests</p>

                  <p className="mt-2 text-3xl font-bold text-navy">
                    {connectionsQuery.isPending ? "—" : incomingRequests.length}
                  </p>
                </div>

                <div className="rounded-xl bg-warning/10 p-3 text-warning-strong">
                  <UserPlus className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <Link
                to={paths.connections}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
              >
                Review requests
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Requests sent</p>

                  <p className="mt-2 text-3xl font-bold text-navy">
                    {connectionsQuery.isPending ? "—" : outgoingRequests.length}
                  </p>
                </div>

                <div className="rounded-xl bg-accent/10 p-3 text-accent">
                  <Send className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <Link
                to={paths.connections}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
              >
                View requests
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">Profile completion</h2>

                <p className="mt-1 text-sm text-muted">
                  Make your profile more useful to other members.
                </p>
              </div>

              {profile && (
                <Badge tone={profileCompletion === 100 ? "success" : "brand"}>
                  {profileCompletion}%
                </Badge>
              )}
            </div>

            {profileQuery.isPending ? (
              <p className="mt-5 text-sm text-muted">
                Loading profile information...
              </p>
            ) : profile ? (
              <>
                <div
                  className="mt-5 h-2 overflow-hidden rounded-full bg-line"
                  role="progressbar"
                  aria-label="Profile completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={profileCompletion}
                >
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>

                <p className="mt-3 text-sm text-muted">
                  {completedProfileItems} of 8 profile sections completed.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4 text-muted" />
                    Headline
                    {profile.headline ? (
                      <Badge tone="success">Done</Badge>
                    ) : (
                      <Badge tone="warning">Add</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted" />
                    Location
                    {profile.location ? (
                      <Badge tone="success">Done</Badge>
                    ) : (
                      <Badge tone="warning">Add</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted" />
                    Education
                    {profile.education.length > 0 ? (
                      <Badge tone="success">Done</Badge>
                    ) : (
                      <Badge tone="warning">Add</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-muted" />
                    Projects
                    {profile.projects.length > 0 ? (
                      <Badge tone="success">Done</Badge>
                    ) : (
                      <Badge tone="warning">Add</Badge>
                    )}
                  </div>
                </div>

                <Link
                  to={paths.editProfile}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
                >
                  Improve your profile
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <p className="mt-5 text-sm text-muted">
                Profile completion is unavailable right now.
              </p>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">Grow your network</h2>

                <p className="mt-1 text-sm text-muted">
                  Find people and build professional relationships.
                </p>
              </div>

              <div className="rounded-xl bg-brand/10 p-3 text-brand">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="font-medium text-ink">Discover professionals</p>
                <p className="mt-1 text-sm text-muted">
                  Find people by skills, location, and account type.
                </p>
                <Link
                  to={paths.discover}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
                >
                  Discover people
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="border-t border-line pt-4">
                <p className="font-medium text-ink">Manage your connections</p>
                <p className="mt-1 text-sm text-muted">
                  Review requests and manage accepted connections.
                </p>
                <Link
                  to={paths.connections}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
                >
                  Manage connections
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">Recent connections</h2>

                <p className="mt-1 text-sm text-muted">
                  People you've connected with.
                </p>
              </div>

              <Link
                to={paths.connections}
                className="text-sm font-semibold text-brand hover:text-brand-hover"
              >
                View all
              </Link>
            </div>

            {connectionsQuery.isPending ? (
              <p className="mt-5 text-sm text-muted">Loading connections...</p>
            ) : latestConnections.length > 0 ? (
              <div className="mt-5 space-y-4">
                {latestConnections.map((connection) => (
                  <div key={connection.id} className="flex items-center gap-3">
                    <Link to={paths.profilePattern.replace(":userId", connection.user.userId)} aria-label={`View ${connection.user.displayName}'s profile`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                      <Avatar name={connection.user.displayName} src={connection.user.avatarUrl ?? undefined} size="md" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={paths.profilePattern.replace(
                          ":userId",
                          connection.user.userId,
                        )}
                        className="font-medium text-navy hover:text-brand"
                      >
                        {connection.user.displayName}
                      </Link>

                      <p className="truncate text-sm text-muted">
                        {connection.user.headline || "SkillBridge member"}
                      </p>
                    </div>

                    <Badge tone="success">Connected</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-line p-5 text-center">
                <Users className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-2 text-sm font-medium text-navy">
                  No connections yet
                </p>
                <p className="mt-1 text-sm text-muted">
                  Discover people and start building your network.
                </p>
                <Link
                  to={paths.discover}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
                >
                  Find people
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">Incoming requests</h2>

                <p className="mt-1 text-sm text-muted">
                  People who want to connect with you.
                </p>
              </div>

              <Link
                to={paths.connections}
                className="text-sm font-semibold text-brand hover:text-brand-hover"
              >
                View all
              </Link>
            </div>

            {connectionsQuery.isPending ? (
              <p className="mt-5 text-sm text-muted">Loading requests...</p>
            ) : latestIncomingRequests.length > 0 ? (
              <div className="mt-5 space-y-4">
                {latestIncomingRequests.map((connection) => (
                  <div key={connection.id} className="flex items-center gap-3">
                    <Link to={paths.profilePattern.replace(":userId", connection.user.userId)} aria-label={`View ${connection.user.displayName}'s profile`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                      <Avatar name={connection.user.displayName} src={connection.user.avatarUrl ?? undefined} size="md" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={paths.profilePattern.replace(
                          ":userId",
                          connection.user.userId,
                        )}
                        className="font-medium text-navy hover:text-brand"
                      >
                        {connection.user.displayName}
                      </Link>

                      <p className="truncate text-sm text-muted">
                        {connection.user.headline || "SkillBridge member"}
                      </p>
                    </div>

                    <Badge tone="warning">Pending</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-line p-5 text-center">
                <UserPlus className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-2 text-sm font-medium text-navy">
                  No incoming requests
                </p>
                <p className="mt-1 text-sm text-muted">
                  New connection requests will appear here.
                </p>
              </div>
            )}
          </Card>
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <div>
            <p className="text-sm font-medium text-navy">{user?.email}</p>
            <p className="mt-1 text-xs text-muted">
              Account type: {accountTypes || "SkillBridge member"}
            </p>
          </div>

          <Link
            to={paths.myProfile}
            className="text-sm font-semibold text-brand hover:text-brand-hover"
          >
            Manage your profile
          </Link>
        </footer>
      </div>
    </div>
  );
}
