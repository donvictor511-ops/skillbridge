import type { Request, Response } from "express";
import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../../utils/appError";
import {
  deletePostMedia,
  uploadPostMedia,
  type PostMediaType,
} from "../../services/cloudinary";
import type { AuthUser } from "../auth/auth.types";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const MAX_VIDEO_DURATION = 90;

function getAuthenticatedUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Please log in to upload media.",
    );
  }

  if (!req.user.onboardedAt) {
    throw new AppError(
      403,
      "ONBOARDING_REQUIRED",
      "Complete onboarding before uploading media.",
    );
  }

  return req.user;
}

export async function uploadPostMediaController(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);

  if (!req.file) {
    throw new AppError(
      400,
      "MEDIA_REQUIRED",
      "Please select an image or video to upload.",
    );
  }

  // Verify the actual file content instead of trusting its MIME header.
  const detectedType = await fileTypeFromBuffer(req.file.buffer);

  if (!detectedType) {
    throw new AppError(
      400,
      "INVALID_MEDIA_CONTENT",
      "The uploaded file format could not be verified.",
    );
  }

  let mediaType: PostMediaType;

  if (ALLOWED_IMAGE_TYPES.includes(detectedType.mime)) {
    mediaType = "image";
  } else if (ALLOWED_VIDEO_TYPES.includes(detectedType.mime)) {
    mediaType = "video";
  } else {
    throw new AppError(
      400,
      "INVALID_MEDIA_TYPE",
      "Only JPEG, PNG, WebP, MP4, and WebM files are allowed.",
    );
  }

  const uploadedMedia = await uploadPostMedia({
    buffer: req.file.buffer,
    mediaType,
    userId: user.id,
  });

  if (mediaType === "video") {
    if (uploadedMedia.duration === null) {
      try {
        await deletePostMedia(uploadedMedia.publicId, mediaType);
      } catch {
        // Keep the original validation error if cleanup also fails.
      }

      throw new AppError(
        400,
        "VIDEO_DURATION_UNAVAILABLE",
        "We could not verify this video's duration. Please try another video.",
      );
    }

    if (uploadedMedia.duration > MAX_VIDEO_DURATION) {
      try {
        await deletePostMedia(uploadedMedia.publicId, mediaType);
      } catch {
        // Keep the original validation error if cleanup also fails.
      }

      throw new AppError(
        400,
        "VIDEO_TOO_LONG",
        "Videos must be 90 seconds or shorter.",
      );
    }
  }

  res.status(201).json({
    data: {
      mediaUrl: uploadedMedia.mediaUrl,
      mediaType: uploadedMedia.mediaType,
      duration: uploadedMedia.duration,
    },
  });
}
