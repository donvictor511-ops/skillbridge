import { useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router";
import { Check, Clock3, MapPin, MessageSquare, Search, Send, UserMinus, Users, X } from "lucide-react";

import { profilePath } from "../app/paths";
import { paths } from "../app/paths";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  Spinner,
} from "../components/ui";

import {
  useAcceptConnectionRequest,
  useConnections,
  useRejectConnectionRequest,
  useRemoveConnection,
} from "../features/connections/connectionsQueries";

import type { Connection } from "../features/connections/connections.types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface ConnectionCardProps {
  connection: Connection;
  children?: ReactNode;
}

function ConnectionCard({
  connection,
  children,
}: ConnectionCardProps): ReactElement {
  const { user } = connection;

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Link to={profilePath(user.userId)} aria-label={`View ${user.displayName}'s profile`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />
        </Link>

        <div className="min-w-0">
          <Link
            to={profilePath(user.userId)}
            className="font-semibold text-navy hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {user.displayName}
          </Link>

          {user.headline && (
            <p className="mt-1 truncate text-sm text-muted">{user.headline}</p>
          )}

          {user.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {user.location}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </Card>
  );
}

interface ConnectionSectionProps {
  title: string;
  count: number;
  description: string;
  children: ReactNode;
}

function ConnectionSection({
  title,
  count,
  description,
  children,
}: ConnectionSectionProps): ReactElement {
  return (
    <section className="space-y-4" aria-label={title}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <Badge tone="brand">{count}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function ConnectionsPage(): ReactElement {
  useDocumentTitle("My connections | SkillBridge");
  const [search, setSearch] = useState("");

  const connectionsQuery = useConnections();

  const acceptMutation = useAcceptConnectionRequest();
  const rejectMutation = useRejectConnectionRequest();
  const removeMutation = useRemoveConnection();

  const connections = connectionsQuery.data ?? [];

  const matchesSearch = (connection: Connection) => {
    const term = search.trim().toLocaleLowerCase();
    return !term || [connection.user.displayName, connection.user.headline ?? "", connection.user.location ?? ""].some((value) => value.toLocaleLowerCase().includes(term));
  };

  const incomingRequests = connections.filter(
    (connection) =>
      connection.status === "pending" && connection.direction === "incoming" && matchesSearch(connection),
  );

  const outgoingRequests = connections.filter(
    (connection) =>
      connection.status === "pending" && connection.direction === "outgoing" && matchesSearch(connection),
  );

  const acceptedConnections = connections.filter(
    (connection) => connection.status === "accepted" && matchesSearch(connection),
  );

  const hasMutationError =
    acceptMutation.isError || rejectMutation.isError || removeMutation.isError;

  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        <header>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-brand">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Build your professional network</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            My connections
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Manage your connection requests and stay connected with
            professionals in your network.
          </p>
        </header>

        <div className="max-w-xl">
          <Input label="Search your network" placeholder="Name, role, or location" value={search} onChange={(event) => setSearch(event.target.value)} endAdornment={<Search className="mr-2 h-4 w-4 text-muted" aria-hidden="true" />} />
        </div>

        {hasMutationError && (
          <ErrorMessage message="We couldn't complete that action. Please try again." />
        )}

        {connectionsQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : connectionsQuery.isError ? (
          <ErrorMessage
            message="We couldn't load your connections. Please check your connection and try again."
            onRetry={() => void connectionsQuery.refetch()}
          />
        ) : (
          <>
            <ConnectionSection
              title="Incoming requests"
              count={incomingRequests.length}
              description="People who want to connect with you."
            >
              {incomingRequests.length === 0 ? (
                <Card padding="none">
                  <EmptyState
                    title="No incoming requests"
                    description="When someone sends you a connection request, it will appear here."
                    icon={Users}
                  />
                </Card>
              ) : (
                incomingRequests.map((connection) => (
                  <ConnectionCard key={connection.id} connection={connection}>
                    <Button
                      size="sm"
                      loading={
                        acceptMutation.isPending &&
                        acceptMutation.variables === connection.id
                      }
                      disabled={
                        acceptMutation.isPending ||
                        rejectMutation.isPending ||
                        removeMutation.isPending
                      }
                      onClick={() => acceptMutation.mutate(connection.id)}
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Accept
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      loading={
                        rejectMutation.isPending &&
                        rejectMutation.variables === connection.id
                      }
                      disabled={
                        acceptMutation.isPending ||
                        rejectMutation.isPending ||
                        removeMutation.isPending
                      }
                      onClick={() => rejectMutation.mutate(connection.id)}
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Decline
                    </Button>
                  </ConnectionCard>
                ))
              )}
            </ConnectionSection>

            <ConnectionSection
              title="Sent requests"
              count={outgoingRequests.length}
              description="Connection requests you've sent that are still waiting for a response."
            >
              {outgoingRequests.length === 0 ? (
                <Card padding="none">
                  <EmptyState
                    title="No pending sent requests"
                    description="Requests you send to other professionals will appear here."
                    icon={Send}
                  />
                </Card>
              ) : (
                outgoingRequests.map((connection) => (
                  <ConnectionCard key={connection.id} connection={connection}>
                    <Badge tone="warning">
                      <Clock3 className="h-3.5 w-3.5" />
                      Pending
                    </Badge>

                    <Button
                      size="sm"
                      variant="secondary"
                      loading={
                        removeMutation.isPending &&
                        removeMutation.variables === connection.id
                      }
                      disabled={
                        acceptMutation.isPending ||
                        rejectMutation.isPending ||
                        removeMutation.isPending
                      }
                      onClick={() => removeMutation.mutate(connection.id)}
                    >
                      Cancel request
                    </Button>
                  </ConnectionCard>
                ))
              )}
            </ConnectionSection>

            <ConnectionSection
              title="Your connections"
              count={acceptedConnections.length}
              description="Professionals you've successfully connected with."
            >
              {acceptedConnections.length === 0 ? (
                <Card padding="none">
                  <EmptyState
                    title="Your network is waiting"
                    description="Discover professionals and send connection requests to start building your network."
                    icon={Users}
                    action={
                      <Link to="/discover">
                        <Button size="sm">Discover professionals</Button>
                      </Link>
                    }
                  />
                </Card>
              ) : (
                acceptedConnections.map((connection) => (
                  <ConnectionCard key={connection.id} connection={connection}>
                    {connection.user.mutualConnectionCount ? <Badge tone="neutral">{connection.user.mutualConnectionCount} mutual {connection.user.mutualConnectionCount === 1 ? "connection" : "connections"}</Badge> : null}
                    <Link to={`${paths.messages}?userId=${encodeURIComponent(connection.user.userId)}`}><Button size="sm"><MessageSquare className="mr-1.5 h-4 w-4" />Message</Button></Link>
                    <Badge tone="success">
                      <Check className="h-3.5 w-3.5" />
                      Connected
                    </Badge>

                    <Button
                      size="sm"
                      variant="secondary"
                      loading={
                        removeMutation.isPending &&
                        removeMutation.variables === connection.id
                      }
                      disabled={
                        acceptMutation.isPending ||
                        rejectMutation.isPending ||
                        removeMutation.isPending
                      }
                      onClick={() => removeMutation.mutate(connection.id)}
                      aria-label={`Remove ${connection.user.displayName} from your connections`}
                    >
                      <UserMinus className="mr-1.5 h-4 w-4" />
                      Remove
                    </Button>
                  </ConnectionCard>
                ))
              )}
            </ConnectionSection>
          </>
        )}
      </div>
    </main>
  );
}
