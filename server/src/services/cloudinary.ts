import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { randomUUID } from "node:crypto";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
});

export type ProfileImageType = "avatar" | "cover";

interface UploadProfileImageOptions {
  buffer: Buffer;
  imageType: ProfileImageType;
  userId: string;
}

export async function uploadProfileImage({
  buffer,
  imageType,
  userId,
}: UploadProfileImageOptions): Promise<string> {
  const folder = `skillbridge/profiles/${userId}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation:
          imageType === "avatar"
            ? [
                {
                  width: 500,
                  height: 500,
                  crop: "fill",
                  gravity: "face",
                  quality: "auto",
                  fetch_format: "auto",
                },
              ]
            : [
                {
                  width: 1600,
                  height: 600,
                  crop: "limit",
                  quality: "auto",
                  fetch_format: "auto",
                },
              ],
        public_id: imageType,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("Cloudinary did not return an image URL."));
          return;
        }

        resolve(result.secure_url);
      },
    );

    uploadStream.end(buffer);
  });
}

// Post and comment media uploads.

export type PostMediaType = "image" | "video";

interface UploadPostMediaOptions {
  buffer: Buffer;
  mediaType: PostMediaType;
  userId: string;
}

export interface UploadedPostMedia {
  mediaUrl: string;
  mediaType: PostMediaType;
  publicId: string;
  duration: number | null;
}

export async function uploadPostMedia({
  buffer,
  mediaType,
  userId,
}: UploadPostMediaOptions): Promise<UploadedPostMedia> {
  const folder = `skillbridge/posts/${userId}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: mediaType === "video" ? "video" : "image",
        allowed_formats:
          mediaType === "video"
            ? ["mp4", "webm"]
            : ["jpg", "jpeg", "png", "webp"],
        ...(mediaType === "image"
          ? {
              transformation: [
                {
                  quality: "auto",
                  fetch_format: "auto",
                },
              ],
            }
          : {}),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary did not return valid media details."));
          return;
        }

        resolve({
          mediaUrl: result.secure_url,
          mediaType,
          publicId: result.public_id,
          duration: result.duration ?? null,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

export async function uploadVoiceMessage({ buffer, userId, format }: { buffer: Buffer; userId: string; format: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: `skillbridge/voice-messages/${userId}`,
      resource_type: "video",
      allowed_formats: ["webm", "mp4", "ogg", "m4a", "mp3"],
      format,
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url) return reject(new Error("Cloudinary did not return a voice message URL."));
      resolve(result.secure_url);
    });
    uploadStream.end(buffer);
  });
}

export async function deletePostMedia(
  publicId: string,
  mediaType: PostMediaType,
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: mediaType === "video" ? "video" : "image",
  });
}

export async function uploadJobCv({ buffer, userId, format }: { buffer: Buffer; userId: string; format: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: `skillbridge/job-cvs/${userId}`,
      public_id: randomUUID(),
      resource_type: "raw",
      type: "authenticated",
      format,
      access_mode: "authenticated",
      use_filename: false,
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.public_id) return reject(new Error("Cloudinary did not return a CV identifier."));
      resolve(result.public_id);
    });
    uploadStream.end(buffer);
  });
}

export function createJobCvDownloadUrl(publicId: string, format: string): string {
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: true,
  });
}
