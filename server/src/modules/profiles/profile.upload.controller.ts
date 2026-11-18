import type { Request, Response } from "express";
import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../../utils/appError";
import {
  uploadProfileImage,
  type ProfileImageType,
} from "../../services/cloudinary";
import { getSessionUser, markNotCacheable } from "./profile.http";

const IMAGE_TYPES: Record<string, ProfileImageType> = {
  avatar: "avatar",
  cover: "cover",
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadMyProfileImage(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const rawImageType = req.params.imageType;

  const imageType =
    typeof rawImageType === "string" ? IMAGE_TYPES[rawImageType] : undefined;

  if (!imageType) {
    throw new AppError(
      400,
      "INVALID_IMAGE_TYPE",
      "Choose either an avatar or cover image.",
    );
  }

  if (!req.file) {
    throw new AppError(
      400,
      "IMAGE_REQUIRED",
      "Please select an image to upload.",
    );
  }

  const detectedType = await fileTypeFromBuffer(req.file.buffer);

  if (!detectedType || !ALLOWED_IMAGE_TYPES.includes(detectedType.mime)) {
    throw new AppError(
      400,
      "INVALID_IMAGE_CONTENT",
      "The uploaded file is not a supported JPEG, PNG, or WebP image.",
    );
  }

  const imageUrl = await uploadProfileImage({
    buffer: req.file.buffer,
    imageType,
    userId: user.id,
  });

  markNotCacheable(res);

  res.status(200).json({
    data: {
      imageUrl,
      imageType,
    },
  });
}
