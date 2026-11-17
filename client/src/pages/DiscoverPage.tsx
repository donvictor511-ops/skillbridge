import { useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router";
import { Users, Search, MapPin, ArrowUpRight } from "lucide-react";

import { Avatar, Badge, Button, Card, Input, Select } from "../components/ui";

import { profilePath } from "../app/paths";
import { useDiscoverProfiles } from "../features/discover/discoverQueries";
import type { DiscoverFilters } from "../types/discover";
import type { Capability } from "../types/onboarding";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function DiscoverPage(): ReactElement {
  useDocumentTitle("Discover people | SkillBridge");

  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [accountType, setAccountType] = useState("");

  const [filters, setFilters] = useState<DiscoverFilters>({
    page: 1,
    limit: 12,
  });

  const discoverQuery = useDiscoverProfiles(filters);
  const profiles = discoverQuery.data?.profiles ?? [];
  const pagination = discoverQuery.data?.pagination;

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    setFilters({
      search: search.trim() || undefined,
      skill: skill.trim() || undefined,
      location: location.trim() || undefined,
      accountType: accountType ? (accountType as Capability) : undefined,
      page: 1,
      limit: 12,
    });
  }

  function clearFilters(): void {
    setSearch("");
    setSkill("");
    setLocation("");
    setAccountType("");

    setFilters({
      page: 1,
      limit: 12,
    });
  }

  function changePage(page: number): void {
    setFilters((current) => ({
      ...current,
      page,
    }));

    window.scrollTo({ top: 0, behavior: "smooth" });
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
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Search people"
                placeholder="Search by name or keyword..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <Input
                label="Skill"
                placeholder="e.g. React, UI design"
                value={skill}
                onChange={(event) => setSkill(event.target.value)}
              />

              <Input
                label="Location"
                placeholder="e.g. Benin City, Lagos"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />

              <Select
                label="Account type"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
              >
                <option value="">All account types</option>
                <option value="professional">Professional</option>
                <option value="client">Client or business</option>
              </Select>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              <Button type="submit" className="gap-2">
                <Search className="h-4 w-4" aria-hidden="true" />
                Find people
              </Button>

              <Button type="button" variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </form>
        </Card>

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
            <p className="text-sm text-muted" role="status">
              Loading people...
            </p>
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
            {profiles.map((person) => (
              <Card key={person.userId}>
                <div className="flex items-start gap-3">
                  <Avatar
                    name={person.displayName}
                    src={person.avatarUrl ?? undefined}
                    size="lg"
                  />

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

                <div className="mt-5 border-t border-line pt-4">
                  <Link
                    to={profilePath(person.userId)}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                  >
                    View profile
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-5">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1 || discoverQuery.isFetching}
                onClick={() => changePage(pagination.page - 1)}
              >
                Previous
              </Button>

              <p className="text-sm text-muted">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <Button
                variant="secondary"
                disabled={
                  pagination.page >= pagination.totalPages ||
                  discoverQuery.isFetching
                }
                onClick={() => changePage(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
