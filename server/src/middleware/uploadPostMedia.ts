import multer from "multer";
import { AppError } from "../utils/appError";

const MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25 MB

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MEDIA_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new AppError(
          400,
          "INVALID_MEDIA_TYPE",
          "Only JPEG, PNG, WebP, MP4, and WebM files are allowed.",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

export const uploadSinglePostMedia = upload.single("file");
