import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { MessageSquareText } from "lucide-react";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Spinner } from "../../components/ui/Spinner";
import { PostCard } from "./PostCard";
import { PostComposer } from "./PostComposer";
import { usePosts } from "./postsQueries";

export function PostsFeedPage() {
  const lastScrolledHash = useRef<string | null>(null);
  const location = useLocation();
  const postsQuery = usePosts();
  const {
    hasNextPage,
    isFetchingNextPage,
    isError: isFeedError,
    fetchNextPage,
  } = postsQuery;

  useEffect(() => {
    document.title = "Feed | SkillBridge";
  }, []);

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [postsQuery.data],
  );

  useEffect(() => {
    const hash = location.hash;
    if (!hash || hash === lastScrolledHash.current) return;
    const target = document.getElementById(hash.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      lastScrolledHash.current = hash;
    } else if (
      hasNextPage &&
      !isFetchingNextPage &&
      !isFeedError
    ) {
      void fetchNextPage();
    }
  }, [location.hash, posts, hasNextPage, isFetchingNextPage, isFeedError, fetchNextPage]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            SkillBridge Community
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your Feed
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Discover ideas, share your progress, and connect with professionals.
          </p>
        </header>

        <div className="space-y-5">
          <PostComposer />

          {postsQuery.isPending && (
            <Card className="flex items-center justify-center gap-3 py-10">
              <Spinner size="lg" label="Loading posts" />
              <p className="text-sm text-slate-600">Loading your feed...</p>
            </Card>
          )}

          {postsQuery.isError && (
            <ErrorMessage
              title="Couldn't load your feed"
              message={
                postsQuery.error instanceof Error
                  ? postsQuery.error.message
                  : "Something went wrong while loading posts."
              }
              onRetry={() => void postsQuery.refetch()}
            />
          )}

          {!postsQuery.isPending &&
            !postsQuery.isError &&
            posts.length === 0 && (
              <Card>
                <EmptyState
                  icon={MessageSquareText}
                  title="Your feed is waiting"
                  description="Be the first to share an update with the SkillBridge community."
                />
              </Card>
            )}

          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Spinner size="md" label="Loading more posts" />
            </div>
          )}

          {hasNextPage && !isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Button
                variant="secondary"
                onClick={() => void fetchNextPage()}
              >
                Load more posts
              </Button>
            </div>
          )}

          {posts.length > 0 && !hasNextPage && (
            <p className="py-5 text-center text-sm text-slate-500">
              You're all caught up.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
