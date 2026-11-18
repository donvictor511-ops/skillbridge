import multer from "multer";
import { AppError } from "../utils/appError";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new AppError(
          400,
          "INVALID_IMAGE_TYPE",
          "Only JPEG, PNG, and WebP images are allowed.",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

export const uploadSingleImage = upload.single("image");
