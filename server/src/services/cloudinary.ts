import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

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
