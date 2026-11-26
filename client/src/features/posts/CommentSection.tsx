import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";

import { profilePath } from "../../app/paths";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { useCurrentUser } from "../auth/authQueries";
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
  useToggleCommentLike,
} from "./postsQueries";
import { uploadPostMedia } from "./postsService";

import type { PostComment } from "./posts.types";
import { ContentReportButton } from "./ContentReportButton";

interface CommentSectionProps {
  postId: string;
}

const MAX_COMMENT_LENGTH = 2000;
const MAX_MEDIA_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION = 90;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

type MediaType = "image" | "video";

function formatCommentDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<PostComment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const replyComposerRef = useRef<HTMLFormElement>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const currentUserQuery = useCurrentUser();
  const commentsQuery = useComments(postId);

  const createMutation = useCreateComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();
  const likeMutation = useToggleCommentLike(postId);

  const comments = commentsQuery.data ?? [];
  const isBusy = createMutation.isPending || isUploadingMedia;
  const commentsByParent = new Map<string | null, PostComment[]>();
  for (const comment of comments) {
    const siblings = commentsByParent.get(comment.parentCommentId) ?? [];
    siblings.push(comment);
    commentsByParent.set(comment.parentCommentId, siblings);
  }

  useEffect(() => {
    if (!replyTarget) return;
    const frame = window.requestAnimationFrame(() => {
      replyComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      replyComposerRef.current?.querySelector("textarea")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [replyTarget?.id]);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  async function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMediaError(null);

    if (file.size > MAX_MEDIA_SIZE) {
      setMediaError("The selected file must not exceed 25 MB.");
      event.target.value = "";
      return;
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      setMediaError("Choose a JPEG, PNG, WebP, MP4, or WebM file.");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (isVideo) {
      try {
        const duration = await new Promise<number>((resolve, reject) => {
          const video = document.createElement("video");

          video.preload = "metadata";
          video.onloadedmetadata = () => resolve(video.duration);
          video.onerror = () => reject(new Error("Unable to read video."));
          video.src = previewUrl;
        });

        if (!Number.isFinite(duration)) {
          throw new Error("We couldn't verify this video's duration.");
        }

        if (duration > MAX_VIDEO_DURATION) {
          throw new Error("Videos must be 90 seconds or shorter.");
        }
      } catch (error) {
        URL.revokeObjectURL(previewUrl);
        setMediaError(
          error instanceof Error
            ? error.message
            : "Unable to verify this video.",
        );
        event.target.value = "";
        return;
      }
    }

    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");
    setMediaPreviewUrl(previewUrl);
  }

  function removeMedia() {
    setMediaFile(null);
    setMediaType(null);
    setMediaPreviewUrl(null);
    setMediaError(null);
  }

  async function handleCreateComment() {
    const trimmedContent = content.trim();

    if (
      !trimmedContent ||
      trimmedContent.length > MAX_COMMENT_LENGTH ||
      isBusy
    ) {
      return;
    }

    setMediaError(null);

    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      if (mediaFile) {
        setIsUploadingMedia(true);

        try {
          const uploadedMedia = await uploadPostMedia(mediaFile);

          if (uploadedMedia.mediaType === "image") {
            imageUrl = uploadedMedia.mediaUrl;
          } else {
            videoUrl = uploadedMedia.mediaUrl;
          }
        } finally {
          setIsUploadingMedia(false);
        }
      }

      await createMutation.mutateAsync({
        postId,
        input: {
          content: trimmedContent,
          ...(replyTarget ? { parentCommentId: replyTarget.id } : {}),
          imageUrl,
          videoUrl,
        },
      });

      setContent("");
      setReplyTarget(null);
      removeMedia();
    } catch {
      // The mutation error is displayed below.
    }
  }

  function startEditing(comment: PostComment) {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    updateMutation.reset();
  }

  function cancelEditing() {
    setEditingCommentId(null);
    setEditContent("");
    updateMutation.reset();
  }

  async function handleUpdateComment(commentId: string) {
    const trimmedContent = editContent.trim();

    if (!trimmedContent || trimmedContent.length > MAX_COMMENT_LENGTH) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        postId,
        commentId,
        input: { content: trimmedContent },
      });

      cancelEditing();
    } catch {
      // The mutation error is displayed below.
    }
  }

  async function handleDeleteComment(commentId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        postId,
        commentId,
      });

      if (editingCommentId === commentId) {
        cancelEditing();
      }
    } catch {
      // The mutation error is displayed below.
    }
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  function renderComposer() {
    return (
      <form
        ref={replyTarget ? replyComposerRef : undefined}
        onSubmit={(event) => { event.preventDefault(); void handleCreateComment(); }}
        className={`space-y-2 rounded-xl ${replyTarget ? "mt-3 border border-blue-100 bg-white p-3" : "border border-slate-200 bg-white p-3"}`}
      >
        {replyTarget ? <div className="flex items-center justify-between gap-2 text-xs text-blue-800"><span>Replying to <strong>{replyTarget.author.displayName}</strong></span><button type="button" onClick={() => { setReplyTarget(null); setContent(""); removeMedia(); }} className="shrink-0 font-semibold hover:underline">Cancel</button></div> : null}
        <Textarea
          label={replyTarget ? "Write a reply" : "Write a comment"}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={replyTarget ? `Reply to ${replyTarget.author.displayName}…` : "Write a comment…"}
          rows={2}
          maxLength={MAX_COMMENT_LENGTH}
          hint={`${content.length}/2000 characters`}
          disabled={isBusy}
          className="min-h-16 rounded-2xl bg-slate-50"
        />
        {mediaPreviewUrl && mediaType ? <div className="relative overflow-hidden rounded-xl border border-slate-200">
          {mediaType === "image" ? <img src={mediaPreviewUrl} alt="Selected comment attachment preview" className="max-h-72 w-full object-contain" /> : <video src={mediaPreviewUrl} controls preload="metadata" playsInline className="max-h-72 w-full bg-black" />}
          <button type="button" onClick={removeMedia} disabled={isBusy} className="absolute right-2 top-2 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50">Remove media</button>
        </div> : null}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><span aria-hidden="true">📎</span><span>Photo or video</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={handleMediaChange} disabled={isBusy} className="sr-only" /></label>
          <span className="text-xs text-slate-500">Max 25 MB · videos up to 90 seconds</span>
          <Button type="submit" size="sm" loading={isBusy} disabled={!content.trim() || content.length > MAX_COMMENT_LENGTH} className="ml-auto rounded-full px-5">{isUploadingMedia ? "Uploading…" : replyTarget ? "Reply" : "Comment"}</Button>
        </div>
        {mediaError ? <p role="alert" className="text-sm text-red-600">{mediaError}</p> : null}
        {createMutation.isError ? <p role="alert" className="text-sm text-red-600">{getErrorMessage(createMutation.error, "Unable to add your comment.")}</p> : null}
      </form>
    );
  }

  function renderComment(comment: PostComment, depth = 0) {
    const isOwner = currentUserQuery.data?.id === comment.author.userId;
    const isEditing = editingCommentId === comment.id;
    const children = commentsByParent.get(comment.id) ?? [];
    return (
      <div key={comment.id} className="space-y-2" style={depth ? { marginLeft: `${Math.min(depth * 18, 72)}px` } : undefined}>
        <article id={`comment-${comment.id}`} className="flex min-w-0 items-start gap-2 sm:gap-3">
          <Link to={profilePath(comment.author.userId)} aria-label={`View ${comment.author.displayName}'s profile`} className="shrink-0">
            <Avatar name={comment.author.displayName} src={comment.author.avatarUrl} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl bg-slate-100 px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <div className="min-w-0">
                  <Link to={profilePath(comment.author.userId)} className="break-words text-sm font-semibold text-slate-900 hover:text-blue-700">{comment.author.displayName}</Link>
                  <time dateTime={comment.createdAt} className="ml-2 text-[11px] text-slate-500">{formatCommentDate(comment.createdAt)}{comment.updatedAt !== comment.createdAt ? " · Edited" : ""}</time>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!isOwner && currentUserQuery.data?.onboardedAt ? <ContentReportButton postId={postId} commentId={comment.id} /> : null}
                  {isOwner && !isEditing ? <>
                    <button type="button" onClick={() => startEditing(comment)} className="text-xs font-medium text-slate-600 hover:text-blue-700">Edit</button>
                    <button type="button" onClick={() => void handleDeleteComment(comment.id)} disabled={deleteMutation.isPending} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">Delete</button>
                  </> : null}
                </div>
              </div>
              {isEditing ? <div className="mt-3 space-y-2">
                <Textarea label="Edit comment" value={editContent} onChange={(event) => setEditContent(event.target.value)} rows={2} maxLength={MAX_COMMENT_LENGTH} />
                <div className="flex gap-2"><Button size="sm" onClick={() => void handleUpdateComment(comment.id)} loading={updateMutation.isPending} disabled={!editContent.trim() || editContent.length > MAX_COMMENT_LENGTH}>Save</Button><Button size="sm" variant="secondary" onClick={cancelEditing} disabled={updateMutation.isPending}>Cancel</Button></div>
                {updateMutation.isError ? <p role="alert" className="text-sm text-red-600">{getErrorMessage(updateMutation.error, "Unable to update this comment.")}</p> : null}
              </div> : <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{comment.content}</p>}
              {comment.imageUrl ? <img src={comment.imageUrl} alt="Comment attachment" loading="lazy" className="mt-3 max-h-72 w-full rounded-lg object-contain" /> : null}
              {comment.videoUrl ? <video controls preload="metadata" playsInline className="mt-3 max-h-72 w-full rounded-lg bg-black"><source src={comment.videoUrl} />Your browser does not support video playback.</video> : null}
            </div>
            <div className="flex items-center gap-4 px-2 pt-1">
              <button type="button" onClick={() => likeMutation.mutate({ commentId: comment.id, liked: !comment.isLikedByViewer })} disabled={!currentUserQuery.data?.onboardedAt || likeMutation.isPending} aria-pressed={comment.isLikedByViewer} className={`text-xs font-semibold hover:underline disabled:opacity-50 ${comment.isLikedByViewer ? "text-blue-700" : "text-slate-500"}`}>{comment.isLikedByViewer ? "Liked" : "Like"}{comment.likesCount > 0 ? ` · ${comment.likesCount}` : ""}</button>
              {currentUserQuery.data?.onboardedAt ? <button type="button" onClick={() => { setReplyTarget(comment); setContent(""); removeMedia(); }} className="text-xs font-semibold text-slate-500 hover:text-blue-700 hover:underline">Reply</button> : null}
              {likeMutation.isError ? <span role="alert" className="text-xs text-red-600">Could not update reaction.</span> : null}
              {deleteMutation.isError ? <span role="alert" className="text-xs text-red-600">Unable to delete this comment. Please try again.</span> : null}
            </div>
            {replyTarget?.id === comment.id ? renderComposer() : null}
          </div>
        </article>
        {children.length ? <div className="space-y-3 border-l-2 border-slate-200 pl-3">{children.map((child) => renderComment(child, depth + 1))}</div> : null}
      </div>
    );
  }

  return (
    <section
      aria-label="Post comments"
      className="mt-4 space-y-4 border-t border-slate-100 pt-4"
    >
      <div className="space-y-4">
        {commentsQuery.isPending && (
          <p className="text-sm text-slate-500">Loading comments...</p>
        )}

        {commentsQuery.isError && (
          <div role="alert" className="space-y-2">
            <p className="text-sm text-red-600">Unable to load comments.</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void commentsQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        )}

        {commentsQuery.isSuccess && comments.length === 0 && (
          <p className="text-sm text-slate-500">
            No comments yet. Be the first to comment.
          </p>
        )}

        {(commentsByParent.get(null) ?? []).map((comment) => renderComment(comment))}
      </div>
      {replyTarget ? null : renderComposer()}
    </section>
  );
}
