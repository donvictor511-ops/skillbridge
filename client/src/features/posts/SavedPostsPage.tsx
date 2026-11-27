import { useMemo } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Spinner } from "../../components/ui/Spinner";
import { PostCard } from "./PostCard";
import { usePosts } from "./postsQueries";

export function SavedPostsPage() {
  const query = usePosts(true);
  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl">
    <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Your library</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Saved posts</h1><p className="mt-2 text-sm text-slate-600">Keep useful ideas and projects close at hand.</p></header>
    <div className="space-y-5">
      {query.isPending ? <Card className="flex items-center justify-center gap-3 py-10"><Spinner size="lg" label="Loading saved posts" /><p className="text-sm text-slate-600">Loading saved posts…</p></Card> : null}
      {query.isError ? <ErrorMessage title="Couldn’t load saved posts" message="Please try again." onRetry={() => void query.refetch()} /> : null}
      {query.isSuccess && posts.length === 0 ? <Card><EmptyState icon={Bookmark} title="Nothing saved yet" description="Save a post from your feed to find it here later." /></Card> : null}
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
      {query.hasNextPage ? <div className="flex justify-center"><Button variant="secondary" onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage}>Load more saved posts</Button></div> : null}
    </div>
  </div></main>;
}
