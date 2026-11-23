import multer from "multer";
import { AppError } from "../utils/appError";

const allowed = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/x-m4a"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowed.includes(file.mimetype.split(";")[0] ?? "")) {
      callback(new AppError(400, "INVALID_AUDIO_TYPE", "Record or select a WebM, MP4, OGG, or MP3 voice message."));
      return;
    }
    callback(null, true);
  },
});

export const uploadSingleAudioMessage = upload.single("file");
