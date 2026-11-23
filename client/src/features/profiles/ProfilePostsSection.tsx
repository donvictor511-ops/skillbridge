import { useState } from "react";
import type { ReactElement } from "react";
import { ArrowDown, ArrowUp, MessageSquareText } from "lucide-react";
import { Card, EmptyState, ErrorMessage, Spinner } from "../../components/ui";
import { PostCard } from "../posts/PostCard";
import { useProfilePosts } from "./profileQueries";

export function ProfilePostsSection({ userId }: { userId: string }): ReactElement {
  const query = useProfilePosts(userId);
  const [expanded, setExpanded] = useState(false);
  const posts = query.data?.pages.flatMap((page) => page.data) ?? [];
  const visiblePosts = expanded ? posts : posts.slice(0, 1);

  async function showAllPosts() {
    setExpanded(true);
    let hasMore = query.hasNextPage;
    while (hasMore) {
      const nextPage = await query.fetchNextPage();
      if (nextPage.isFetchNextPageError) break;
      hasMore = nextPage.hasNextPage;
    }
  }

  return <section aria-labelledby="profile-posts-heading" className="space-y-4">
    <Card><div className="flex items-center justify-between gap-3"><div><h2 id="profile-posts-heading" className="text-xl font-bold text-navy">Posts</h2><p className="mt-1 text-sm text-muted">Recent public posts from this member.</p></div><MessageSquareText className="h-5 w-5 text-brand" aria-hidden="true" /></div></Card>
    {query.isPending ? <Card className="flex justify-center py-10"><Spinner label="Loading profile posts" /></Card> : null}
    {query.isError ? <ErrorMessage title="Couldn’t load posts" message="Please try again." onRetry={() => void query.refetch()} /> : null}
    {query.isSuccess && posts.length === 0 ? <Card><EmptyState icon={MessageSquareText} title="No posts yet" description="Posts this member shares will appear here." /></Card> : null}
    {visiblePosts.map((post) => <PostCard key={post.id} post={post} />)}
    {!expanded && (posts.length > 1 || query.hasNextPage) ? <div className="flex justify-center"><button type="button" onClick={() => void showAllPosts()} disabled={query.isFetchingNextPage} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-navy hover:bg-page disabled:opacity-60">{query.isFetchingNextPage ? <Spinner label="Loading remaining posts" /> : <><ArrowDown className="h-4 w-4" />See more posts</>}</button></div> : null}
    {expanded && (posts.length > 1 || query.hasNextPage) ? <div className="flex flex-wrap justify-center gap-2">
      {query.hasNextPage ? <button type="button" onClick={() => void showAllPosts()} disabled={query.isFetchingNextPage} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-navy hover:bg-page disabled:opacity-60">{query.isFetchingNextPage ? <Spinner label="Loading more posts" /> : <><ArrowDown className="h-4 w-4" />Load older posts</>}</button> : null}
      {posts.length > 1 ? <button type="button" onClick={() => setExpanded(false)} disabled={query.isFetchingNextPage} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-navy hover:bg-page disabled:opacity-60"><ArrowUp className="h-4 w-4" />See less posts</button> : null}
    </div> : null}
    {query.isFetchNextPageError ? <p role="alert" className="text-center text-sm text-danger-strong">Couldn’t load more posts. Try again.</p> : null}
  </section>;
}
