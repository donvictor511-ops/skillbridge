import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";

import { paths } from "../../app/paths";
import { Avatar } from "../../components/ui/Avatar";
import { Textarea } from "../../components/ui/Textarea";
import { useMyProfile } from "../profiles/profileQueries";
import { useCreatePost } from "./postsQueries";
import { uploadPostMedia } from "./postsService";

const MAX_POST_LENGTH = 3000;
const MAX_MEDIA_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION = 90;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

type MediaType = "image" | "video";

export function PostComposer() {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const profileQuery = useMyProfile();
  const createPostMutation = useCreatePost();

  const profile = profileQuery.data;
  const trimmedContent = content.trim();
  const remainingCharacters = MAX_POST_LENGTH - content.length;
  const isBusy = createPostMutation.isPending || isUploadingMedia;

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
    setSubmitError(null);

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
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if ((!trimmedContent && !mediaFile) || isBusy) {
      return;
    }

    setMediaError(null);
    setSubmitError(null);

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

      await createPostMutation.mutateAsync({
        content: trimmedContent,
        imageUrl,
        videoUrl,
      });

      setContent("");
      removeMedia();
    } catch (error) {
      const apiMessage = isAxiosError<{ error?: { message?: string } }>(error)
        ? error.response?.data?.error?.message
        : null;
      setSubmitError(
        apiMessage ??
          (error instanceof Error
            ? error.message
            : "We couldn't upload the media or publish your post. Please try again."),
      );
    }
  }

  const errorMessage =
    createPostMutation.error instanceof Error
      ? createPostMutation.error.message
      : "We couldn't publish your post. Please try again.";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <Link to={paths.myProfile} aria-label="View your profile" className="shrink-0 rounded-full">
          <Avatar name={profile?.displayName ?? "Your profile"} src={profile?.avatarUrl} size="lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">
            Share an update
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Share your ideas, progress, or something useful with the community.
          </p>
          <Link to={paths.savedPosts} className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:underline">View saved posts</Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <Textarea
          label="What's on your mind?"
          placeholder="What would you like to share with the SkillBridge community?"
          rows={4}
          value={content}
          maxLength={MAX_POST_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          disabled={isBusy}
          className="min-h-28"
        />

        {mediaPreviewUrl && mediaType && (
          <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-200">
            {mediaType === "image" ? (
              <img
                src={mediaPreviewUrl}
                alt="Selected post attachment preview"
                className="max-h-80 w-full object-contain"
              />
            ) : (
              <video
                src={mediaPreviewUrl}
                controls
                preload="metadata"
                className="max-h-80 w-full bg-black"
              />
            )}

            <button
              type="button"
              onClick={removeMedia}
              disabled={isBusy}
              className="absolute right-2 top-2 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              Remove media
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <span>📎 Add photo or video</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={handleMediaChange}
              disabled={isBusy}
              className="sr-only"
            />
          </label>

          <p className="text-xs text-slate-500">
            Maximum 25 MB · Videos up to 90 seconds
          </p>
        </div>

        {mediaError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {mediaError}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-xs ${
              remainingCharacters < 100 ? "text-amber-600" : "text-slate-500"
            }`}
          >
            {remainingCharacters} characters remaining
          </p>

          <button
            type="submit"
            disabled={(!trimmedContent && !mediaFile) || isBusy}
            className="inline-flex items-center justify-center rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploadingMedia
              ? "Uploading media..."
              : createPostMutation.isPending
                ? "Publishing..."
                : "Publish post"}
          </button>
        </div>

        {(submitError || createPostMutation.isError) && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {submitError ?? errorMessage}
          </p>
        )}
      </form>
    </section>
  );
}
