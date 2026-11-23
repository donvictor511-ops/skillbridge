import { useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Users,
  Search,
  MapPin,
  ArrowUpRight,
  UserPlus,
  UserMinus,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";

import { Avatar, Badge, Button, Card, Input, Select, Skeleton } from "../components/ui";
import { profilePath } from "../app/paths";
import { useDiscoverProfiles, useRecommendedProfiles } from "../features/discover/discoverQueries";
import {
  useConnections,
  useRemoveConnection,
  useSendConnectionRequest,
} from "../features/connections/connectionsQueries";
import type { DiscoverFilters } from "../types/discover";
import type { Capability } from "../types/onboarding";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { LoadMoreButton } from "../components/ui/LoadMoreButton";

interface DiscoverDraft {
  search: string;
  skill: string;
  location: string;
  accountType: string;
  networkStatus: string;
}

function draftFromParams(params: URLSearchParams): DiscoverDraft {
  return {
    search: params.get("search") ?? "",
    skill: params.get("skill") ?? "",
    location: params.get("location") ?? "",
    accountType: params.get("accountType") ?? "",
    networkStatus: params.get("networkStatus") ?? "",
  };
}

export default function DiscoverPage(): ReactElement {
  useDocumentTitle("Discover people | SkillBridge");

  const [searchParams, setSearchParams] = useSearchParams();

  const paramsKey = searchParams.toString();
  const [draftState, setDraftState] = useState(() => ({ key: paramsKey, value: draftFromParams(searchParams) }));
  const draft = draftState.key === paramsKey ? draftState.value : draftFromParams(searchParams);

  function updateDraft(field: keyof DiscoverDraft, value: string): void {
    setDraftState({ key: paramsKey, value: { ...draft, [field]: value } });
  }

  const filters: DiscoverFilters = {
    search: searchParams.get("search") || undefined,
    skill: searchParams.get("skill") || undefined,
    location: searchParams.get("location") || undefined,
    accountType:
      (searchParams.get("accountType") as Capability | null) ?? undefined,
    networkStatus: (searchParams.get("networkStatus") as DiscoverFilters["networkStatus"] | null) ?? undefined,
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    limit: 12,
  };

  const discoverQuery = useDiscoverProfiles(filters);
  const recommendationsQuery = useRecommendedProfiles();
  const connectionsQuery = useConnections();
  const sendRequest = useSendConnectionRequest();
  const removeConnection = useRemoveConnection();

  const profiles = discoverQuery.data?.pages.flatMap((page) => page.profiles) ?? [];
  const pagination = discoverQuery.data?.pages.at(-1)?.pagination;
  const connections = connectionsQuery.data ?? [];

  const connectionByUserId = new Map(
    connections.map((connection) => [connection.user.userId, connection]),
  );

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const nextParams = new URLSearchParams();

    if (draft.search.trim()) nextParams.set("search", draft.search.trim());
    if (draft.skill.trim()) nextParams.set("skill", draft.skill.trim());
    if (draft.location.trim()) nextParams.set("location", draft.location.trim());
    if (draft.accountType) nextParams.set("accountType", draft.accountType);
    if (draft.networkStatus) nextParams.set("networkStatus", draft.networkStatus);

    nextParams.set("page", "1");
    nextParams.set("limit", "12");

    setSearchParams(nextParams);
  }

  function clearFilters(): void {
    setSearchParams({
      page: "1",
      limit: "12",
    });
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-brand">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Grow your professional network</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Discover people
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Find professionals, explore different skills, and connect with
            people who share your interests.
          </p>
        </header>

        <Card>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Search people"
                placeholder="Search by name or keyword..."
                value={draft.search}
                onChange={(event) => updateDraft("search", event.target.value)}
              />

              <Input
                label="Skill"
                placeholder="e.g. React, UI design"
                value={draft.skill}
                onChange={(event) => updateDraft("skill", event.target.value)}
              />

              <Input
                label="Location"
                placeholder="e.g. Benin City, Lagos"
                value={draft.location}
                onChange={(event) => updateDraft("location", event.target.value)}
              />

              <Select
                label="Account type"
                value={draft.accountType}
                onChange={(event) => updateDraft("accountType", event.target.value)}
              >
                <option value="">All account types</option>
                <option value="professional">Professional</option>
                <option value="client">Client or business</option>
              </Select>

              <Select label="Network status" value={draft.networkStatus} onChange={(event) => updateDraft("networkStatus", event.target.value)}>
                <option value="">Any network status</option>
                <option value="not_connected">People I’m not connected to</option>
                <option value="connected">My connections</option>
                <option value="pending">Pending requests</option>
              </Select>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              <Button type="submit" className="gap-2" loading={discoverQuery.isFetching && !discoverQuery.isFetchingNextPage} disabled={discoverQuery.isFetching}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Find people
              </Button>

              <Button type="button" variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </form>
        </Card>

        <section className="mt-8" aria-labelledby="recommendations-heading">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
            <div>
              <h2 id="recommendations-heading" className="text-lg font-semibold text-navy">People you may want to meet</h2>
              <p className="mt-0.5 text-sm text-muted">Suggestions based on shared skills, interests, location, and mutual connections.</p>
            </div>
          </div>
          {recommendationsQuery.isPending ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading professional recommendations">{[0, 1, 2].map((item) => <Card key={item}><div className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div><Skeleton className="mt-4 h-3 w-5/6" /><Skeleton className="mt-2 h-9 w-28" /></Card>)}</div>
            : recommendationsQuery.isError ? <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger-strong" role="alert">Unable to load suggestions right now.<Button variant="secondary" size="sm" className="ml-3" onClick={() => void recommendationsQuery.refetch()}>Try again</Button></div>
              : recommendationsQuery.data?.recommendations.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{recommendationsQuery.data.recommendations.slice(0, 6).map((person) => <Card key={person.userId}><div className="flex items-start gap-3"><Link to={profilePath(person.userId)} aria-label={`View ${person.displayName}'s profile`} className="shrink-0 rounded-full"><Avatar name={person.displayName} src={person.avatarUrl ?? undefined} size="md" /></Link><div className="min-w-0 flex-1"><Link to={profilePath(person.userId)} className="truncate font-semibold text-navy hover:text-brand">{person.displayName}</Link><p className="mt-1 line-clamp-2 text-sm text-muted">{person.headline || "SkillBridge member"}</p></div></div>{person.reasons?.length ? <ul className="mt-3 space-y-1 text-xs text-muted">{person.reasons.slice(0, 2).map((reason) => <li key={reason} className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 shrink-0 text-brand" aria-hidden="true" />{reason}</li>)}</ul> : null}<div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3"><Link to={profilePath(person.userId)} className="text-sm font-semibold text-brand hover:underline">View profile</Link><Button size="sm" className="gap-1.5" loading={sendRequest.isPending && sendRequest.variables === person.userId} disabled={sendRequest.isPending} onClick={() => sendRequest.mutate(person.userId)}><UserPlus className="h-4 w-4" aria-hidden="true" />Connect</Button></div></Card>)}</div>
                : <Card className="flex items-center gap-3 py-5"><UserRoundSearch className="h-5 w-5 text-muted" aria-hidden="true" /><p className="text-sm text-muted">We’ll suggest people as more professionals join SkillBridge.</p></Card>}
        </section>

        <section className="mt-8" aria-labelledby="discover-heading">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="discover-heading"
              className="text-lg font-semibold text-navy"
            >
              People you can discover
            </h2>

            {pagination && (
              <p className="text-sm text-muted">
                {pagination.total} people found
              </p>
            )}
          </div>

          {discoverQuery.isPending && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading people">{[0, 1, 2, 3, 4, 5].map((item) => <Card key={item}><div className="flex items-center gap-3"><Skeleton className="h-14 w-14 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div><Skeleton className="mt-4 h-3 w-5/6" /><Skeleton className="mt-2 h-3 w-3/5" /><Skeleton className="mt-5 h-9 w-32" /></Card>)}</div>
          )}

          {discoverQuery.isError && (
            <div
              className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger-strong"
              role="alert"
            >
              Unable to load people. Please try again.
              <Button
                variant="secondary"
                size="sm"
                className="ml-3"
                onClick={() => void discoverQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          )}

          {connectionsQuery.isError && (
            <div
              className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger-strong"
              role="alert"
            >
              Unable to load connection statuses. Connect actions are
              temporarily unavailable.
              <Button
                variant="secondary"
                size="sm"
                className="ml-3"
                onClick={() => void connectionsQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          )}

          {(sendRequest.isError || removeConnection.isError) && (
            <p className="mb-4 text-sm text-danger-strong" role="alert">
              {sendRequest.isError
                ? "Unable to send the connection request. Please try again."
                : "Unable to remove this connection. Please try again."}
            </p>
          )}

          {!discoverQuery.isPending &&
            !discoverQuery.isError &&
            profiles.length === 0 && (
              <Card>
                <div className="py-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted" />

                  <h3 className="mt-3 font-semibold text-navy">
                    No people found
                  </h3>

                  <p className="mt-2 text-sm text-muted">
                    Try different search terms or clear your filters.
                  </p>

                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                </div>
              </Card>
            )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((person) => {
              const connection = connectionByUserId.get(person.userId);

              return (
                <Card key={person.userId}>
                  <div className="flex items-start gap-3">
                    <Link to={profilePath(person.userId)} aria-label={`View ${person.displayName}'s profile`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                      <Avatar name={person.displayName} src={person.avatarUrl ?? undefined} size="lg" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-navy">
                        {person.displayName}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {person.headline || "SkillBridge member"}
                      </p>
                    </div>
                  </div>

                  {person.location && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {person.location}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {person.accountTypes.map((type) => (
                      <Badge key={type} tone="brand">
                        {type === "professional"
                          ? "Professional"
                          : "Client or business"}
                      </Badge>
                    ))}
                  </div>

                  {person.skills.length > 0 && (
                    <div className="mt-4 border-t border-line pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Skills
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {person.skills.slice(0, 4).map((item) => (
                          <Badge key={item.id} tone="neutral">
                            {item.name}
                          </Badge>
                        ))}

                        {person.skills.length > 4 && (
                          <Badge tone="accent">
                            +{person.skills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <Link
                      to={profilePath(person.userId)}
                      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                    >
                      View profile
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>

                    {connectionsQuery.isPending || connectionsQuery.isError ? (
                      <Button size="sm" variant="secondary" disabled>
                        Connect
                      </Button>
                    ) : connection?.status === "accepted" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="success">Connected</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={removeConnection.isPending}
                          loading={removeConnection.isPending}
                          onClick={() => removeConnection.mutate(connection.id)}
                          aria-label={`Remove connection with ${person.displayName}`}
                        >
                          <UserMinus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : connection?.status === "pending" &&
                      connection.direction === "outgoing" ? (
                      <Button size="sm" variant="secondary" disabled>
                        Request sent
                      </Button>
                    ) : connection?.status === "pending" &&
                      connection.direction === "incoming" ? (
                      <Badge tone="warning">Incoming request</Badge>
                    ) : connection?.status === "rejected" ? (
                      <Badge tone="neutral">Request declined</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-2"
                        loading={sendRequest.isPending}
                        disabled={sendRequest.isPending}
                        onClick={() => sendRequest.mutate(person.userId)}
                      >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Connect
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {pagination && discoverQuery.hasNextPage ? <LoadMoreButton label="people" loaded={profiles.length} total={pagination.total} loading={discoverQuery.isFetchingNextPage} onClick={() => void discoverQuery.fetchNextPage()} /> : null}
        </section>
      </div>
    </div>
  );
}
