import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Share2, Link2, Check, Repeat2, SmilePlus, MessageCircle, MoreHorizontal, Bookmark } from "lucide-react";

import { paths, profilePath } from "../../app/paths";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Textarea } from "../../components/ui/Textarea";
import { useCurrentUser } from "../auth/authQueries";
import { useConnections } from "../connections/connectionsQueries";
import {
  useDeletePost,
  useLikePost,
  useUnlikePost,
  useUpdatePost,
  useSharePost,
  useRepostPost,
  useUndoRepost,
  useReactToPost,
  useTogglePostBookmark,
} from "./postsQueries";
import { CommentSection } from "./CommentSection";
import { ContentReportButton } from "./ContentReportButton";
import { FollowToggleButton } from "../follows/FollowToggleButton";

import type { Post, PostReaction } from "./posts.types";

const reactionOptions: Array<{ key: PostReaction; emoji: string; label: string }> = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "celebrate", emoji: "🎉", label: "Celebrate" },
  { key: "support", emoji: "🤝", label: "Support" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
];

interface PostCardProps {
  post: Post;
}

function formatPostDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export function PostCard({ post }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(false);

  useEffect(() => {
    function closePostPopovers(event: PointerEvent) {
      if (event.target instanceof Element && !event.target.closest("[data-post-actions]")) {
        setShowReactionPicker(false);
        setShowMoreActions(false);
        setShowShareOptions(false);
        setShowConnections(false);
      }
    }
    document.addEventListener("pointerdown", closePostPopovers);
    return () => document.removeEventListener("pointerdown", closePostPopovers);
  }, []);
  const [sharedWithName, setSharedWithName] = useState<string | null>(null);
  const [repostError, setRepostError] = useState<string | null>(null);

  const currentUserQuery = useCurrentUser();

  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const updateMutation = useUpdatePost();
  const deleteMutation = useDeletePost();
  const shareMutation = useSharePost();
  const repostMutation = useRepostPost();
  const undoRepostMutation = useUndoRepost();
  const reactionMutation = useReactToPost();
  const bookmarkMutation = useTogglePostBookmark();
  const connectionsQuery = useConnections("accepted", showConnections);

  const isOwner = currentUserQuery.data?.id === post.author.userId;
  const isLikePending = likeMutation.isPending || unlikeMutation.isPending || reactionMutation.isPending;
  const postUrl = `${window.location.origin}${paths.posts}#post-${post.id}`;

  async function handleCopyLink() {
    setShareError(null);
    try {
      await navigator.clipboard.writeText(postUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2500);
    } catch {
      setShareError("Could not copy the link. Check your browser permissions.");
    }
  }

  async function handleDeviceShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: `${post.author.displayName} on SkillBridge`, text: post.content, url: postUrl });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setShareError("Could not open the share dialog.");
      }
    }
  }

  async function handleShareWithConnection(userId: string, displayName: string) {
    setShareError(null);
    try {
      await shareMutation.mutateAsync({ postId: post.id, recipientId: userId });
      setSharedWithName(displayName);
    } catch {
      setShareError("Could not share this post. Please try again.");
    }
  }

  const encodedPostUrl = encodeURIComponent(postUrl);
  const encodedShareText = encodeURIComponent(post.content.slice(0, 240));

  async function handleLike() {
    try {
      if (post.isLikedByViewer) {
        await unlikeMutation.mutateAsync(post.id);
      } else {
        await likeMutation.mutateAsync(post.id);
      }
    } catch {
      // The mutation error is displayed below.
    }
  }

  async function handleReaction(reaction: PostReaction) {
    try {
      if (post.viewerReaction === reaction) await unlikeMutation.mutateAsync(post.id);
      else if (reaction === "like") await likeMutation.mutateAsync(post.id);
      else await reactionMutation.mutateAsync({ postId: post.id, reaction });
      setShowReactionPicker(false);
    } catch {
      // The mutation error is displayed below.
    }
  }

  async function handleRepost() {
    setRepostError(null);
    try {
      if (post.isRepostedByViewer) {
        await undoRepostMutation.mutateAsync(post.repostOf?.id ?? post.id);
      } else {
        await repostMutation.mutateAsync(post.repostOf?.id ?? post.id);
      }
    } catch {
      setRepostError("Could not update your repost. Please try again.");
    }
  }

  async function handleUpdate() {
    const trimmedContent = editContent.trim();

    if (!trimmedContent || trimmedContent.length > 3000) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        postId: post.id,
        input: { content: trimmedContent },
      });

      setIsEditing(false);
    } catch {
      // The mutation error is displayed below.
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(post.id);
    } catch {
      // The mutation error is displayed below.
    }
  }

  function cancelEditing() {
    setEditContent(post.content);
    setIsEditing(false);
    updateMutation.reset();
  }

  return (
    <Card padding="md">
      <article id={`post-${post.id}`}>
        <div className="flex items-start gap-3">
          <Link
            to={profilePath(post.author.userId)}
            aria-label={`View ${post.author.displayName}'s profile`}
          >
            <Avatar
              name={post.author.displayName}
              src={post.author.avatarUrl}
              size="lg"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              to={profilePath(post.author.userId)}
              className="font-semibold text-slate-900 hover:text-blue-700"
            >
              {post.author.displayName}
            </Link>

            {post.repostOf ? (
              <p className="mt-0.5 text-xs text-slate-500">
                Reposted from{" "}
                <Link to={profilePath(post.repostOf.author.userId)} className="font-medium text-blue-700 hover:underline">
                  {post.repostOf.author.displayName}
                </Link>
              </p>
            ) : null}

            {post.author.headline && (
              <p className="mt-0.5 text-sm text-slate-600">
                {post.author.headline}
              </p>
            )}

            <time
              dateTime={post.createdAt}
              className="mt-1 block text-xs text-slate-500"
            >
              {formatPostDate(post.createdAt)}
              {post.updatedAt !== post.createdAt && " · Edited"}
            </time>
          </div>

          {!isOwner && currentUserQuery.data?.onboardedAt ? (
            <FollowToggleButton
              userId={post.author.userId}
              isFollowing={post.author.isFollowedByViewer ?? false}
            />
          ) : null}

          {isOwner && (
            <div className="flex shrink-0 items-center gap-2">
              {!isEditing && !post.repostOf && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-medium text-slate-600 hover:text-blue-700"
                >
                  Edit
                </button>
              )}

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
          {!isOwner && currentUserQuery.data?.onboardedAt ? <ContentReportButton postId={post.id} /> : null}
        </div>

        <div className="mt-4">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                label="Edit your post"
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                rows={4}
                maxLength={3000}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  loading={updateMutation.isPending}
                  disabled={!editContent.trim() || editContent.length > 3000}
                >
                  Save changes
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancelEditing}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>

              {updateMutation.isError && (
                <p role="alert" className="text-sm text-red-600">
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : "Unable to update this post."}
                </p>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
              {post.content}
            </p>
          )}

          {!isEditing && post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="Post attachment"
              loading="lazy"
              className="mt-4 max-h-[480px] w-full rounded-xl border border-slate-100 object-contain"
            />
          )}

          {!isEditing && post.videoUrl && (
            <video
              controls
              preload="metadata"
              playsInline
              className="mt-4 max-h-[480px] w-full rounded-xl border border-slate-100 bg-black"
            >
              <source src={post.videoUrl} />
              Your browser does not support video playback.
            </video>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label={`${post.reactionsCount} reactions`}>
            {reactionOptions.filter(({ key }) => post.reactionCounts[key] > 0).map(({ key, emoji, label }) => <span key={key} title={`${label}: ${post.reactionCounts[key]}`}>{emoji}</span>)}
            {post.reactionsCount === 0 ? <span>Be the first to react</span> : <span>{post.reactionsCount} {post.reactionsCount === 1 ? "reaction" : "reactions"}</span>}
          </div>

          <span className="text-sm text-slate-500">
            {post.commentsCount}{" "}
            {post.commentsCount === 1 ? "comment" : "comments"}
          </span>
        </div>

        <div data-post-actions className="mt-3 grid grid-cols-4 items-center gap-1 border-t border-slate-100 pt-2 sm:flex sm:gap-3 sm:pt-3">
          <button
            type="button"
            onClick={handleLike}
            disabled={isLikePending}
            aria-pressed={post.isLikedByViewer}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-xs font-semibold transition disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm ${
                post.viewerReaction
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span aria-hidden="true">{reactionOptions.find(({ key }) => key === post.viewerReaction)?.emoji ?? "👍"}</span>
            {post.viewerReaction ? reactionOptions.find(({ key }) => key === post.viewerReaction)?.label : "Like"}
          </button>

          <div className="relative hidden min-w-0 sm:block">
            <button type="button" onClick={() => setShowReactionPicker((open) => !open)} aria-label="Choose a reaction" aria-expanded={showReactionPicker} disabled={isLikePending} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"><SmilePlus className="h-4 w-4" />React</button>
            {showReactionPicker ? <div role="group" aria-label="Post reactions" className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-full border border-line bg-surface p-2 shadow-card">{reactionOptions.map(({ key, emoji, label }) => <button key={key} type="button" title={label} aria-label={label} onClick={() => void handleReaction(key)} disabled={isLikePending} className={`grid h-10 w-10 place-items-center rounded-full text-xl transition hover:-translate-y-1 hover:bg-brand/10 disabled:opacity-50 ${post.viewerReaction === key ? "bg-brand/10" : ""}`}>{emoji}</button>)}</div> : null}
          </div>

          <button
            type="button"
            onClick={() => void handleRepost()}
            disabled={repostMutation.isPending || undoRepostMutation.isPending || (isOwner && !post.repostOf)}
            aria-pressed={post.isRepostedByViewer}
            className={`hidden min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition disabled:opacity-50 sm:flex sm:px-3 ${post.isRepostedByViewer ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Repeat2 className="h-4 w-4" aria-hidden="true" />
            {repostMutation.isPending ? "Reposting…" : undoRepostMutation.isPending ? "Undoing…" : post.isRepostedByViewer ? "Reposted" : "Repost"}
          </button>

          <button
            type="button"
            onClick={() => setShowComments((current) => !current)}
            aria-expanded={showComments}
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">{showComments ? "Hide" : "Comment"}</span>
            <span className="hidden sm:inline">{showComments ? "Hide comments" : "Comments"}</span>
          </button>

          <button
            type="button"
            onClick={() => bookmarkMutation.mutate({ postId: post.id, save: !post.isBookmarkedByViewer })}
            disabled={bookmarkMutation.isPending}
            aria-pressed={post.isBookmarkedByViewer}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm ${post.isBookmarkedByViewer ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            {post.isBookmarkedByViewer ? "Saved" : "Save"}
          </button>

          <div className="relative min-w-0 sm:ml-auto">
            <button type="button" onClick={() => setShowShareOptions((value) => !value)} aria-expanded={showShareOptions} aria-haspopup="true" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 sm:w-auto sm:gap-2 sm:px-3 sm:text-sm">
              <Share2 className="h-4 w-4" aria-hidden="true" /> Share
            </button>
            {showShareOptions && (
              <div className="absolute bottom-full right-0 z-20 mb-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-card" role="menu" aria-label="Share post">
                {typeof navigator.share === "function" && <button type="button" role="menuitem" onClick={() => void handleDeviceShare()} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-page">Share with…</button>}
                <button type="button" role="menuitem" onClick={() => void handleCopyLink()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-page">
                  {shareCopied ? <Check className="h-4 w-4 text-success-strong" /> : <Link2 className="h-4 w-4" />}
                  {shareCopied ? "Link copied" : "Copy post link"}
                </button>
                <button type="button" role="menuitem" onClick={() => { setShowConnections((value) => !value); setShareError(null); setSharedWithName(null); }} aria-expanded={showConnections} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-page">Share with a connection</button>
                {showConnections && (
                  <div className="max-h-48 space-y-1 overflow-y-auto border-y border-line py-2" aria-label="Accepted connections">
                    {connectionsQuery.isLoading ? <p className="px-3 py-2 text-xs text-muted">Loading connections…</p> : null}
                    {connectionsQuery.isError ? <p className="px-3 py-2 text-xs text-danger-strong">Could not load connections.</p> : null}
                    {connectionsQuery.data?.filter((connection) => connection.status === "accepted").map((connection) => (
                      <button key={connection.id} type="button" onClick={() => void handleShareWithConnection(connection.user.userId, connection.user.displayName)} disabled={shareMutation.isPending} className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-page disabled:opacity-50">
                        {shareMutation.isPending ? "Sharing…" : `Send to ${connection.user.displayName}`}
                      </button>
                    ))}
                    {connectionsQuery.isSuccess && connectionsQuery.data.filter((connection) => connection.status === "accepted").length === 0 && <p className="px-3 py-2 text-xs text-muted">Connect with someone before sharing a post.</p>}
                    {sharedWithName && <p role="status" className="px-3 py-2 text-xs text-success-strong">Shared with {sharedWithName}.</p>}
                  </div>
                )}
                <a role="menuitem" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedPostUrl}`} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-page">Share on LinkedIn</a>
                <a role="menuitem" href={`https://twitter.com/intent/tweet?url=${encodedPostUrl}&text=${encodedShareText}`} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-page">Share on X</a>
                <a role="menuitem" href={`https://wa.me/?text=${encodedShareText}%20${encodedPostUrl}`} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-page">Share on WhatsApp</a>
                {shareError && <p role="alert" className="px-3 py-2 text-xs text-danger-strong">{shareError}</p>}
              </div>
            )}
          </div>
          <div className="relative min-w-0 sm:hidden">
            <button type="button" onClick={() => setShowMoreActions((value) => !value)} aria-label="More post actions" aria-expanded={showMoreActions} className="inline-flex w-full items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />More
            </button>
            {showMoreActions ? <div className="absolute bottom-full right-0 z-30 mb-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-card">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">React to post</p>
              <div className="flex justify-around py-1">{reactionOptions.map(({ key, emoji, label }) => <button key={key} type="button" title={label} aria-label={label} onClick={() => { void handleReaction(key); setShowMoreActions(false); }} disabled={isLikePending} className={`grid h-9 w-9 place-items-center rounded-full text-xl hover:bg-brand/10 disabled:opacity-50 ${post.viewerReaction === key ? "bg-brand/10" : ""}`}>{emoji}</button>)}</div>
              <button type="button" onClick={() => { void handleRepost(); setShowMoreActions(false); }} disabled={repostMutation.isPending || undoRepostMutation.isPending || (isOwner && !post.repostOf)} aria-pressed={post.isRepostedByViewer} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-page disabled:opacity-50"><Repeat2 className="h-4 w-4" />{post.isRepostedByViewer ? "Undo repost" : "Repost"}</button>
            </div> : null}
          </div>
        </div>

        {showComments && <CommentSection postId={post.id} />}

        {(likeMutation.isError || unlikeMutation.isError || reactionMutation.isError) && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            Unable to update your like. Please try again.
          </p>
        )}
        {bookmarkMutation.isError ? <p role="alert" className="mt-2 text-sm text-red-600">Could not update your saved posts. Please try again.</p> : null}

        {repostError ? <p role="alert" className="mt-2 text-sm text-red-600">{repostError}</p> : null}

        {deleteMutation.isError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            Unable to delete this post. Please try again.
          </p>
        )}
      </article>
    </Card>
  );
}
