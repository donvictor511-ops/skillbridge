import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { uploadVoiceMessage } from "../../services/cloudinary";

export async function uploadAudioMessage(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to upload a voice message.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before sending a voice message.");
  if (!req.file) throw new AppError(400, "AUDIO_REQUIRED", "Record a voice message before uploading it.");
  const mime = req.file.mimetype.split(";")[0] ?? "audio/webm";
  const format = mime === "audio/mp4" ? "m4a" : mime === "audio/ogg" ? "ogg" : mime === "audio/mpeg" || mime === "audio/mp3" ? "mp3" : "webm";
  const mediaUrl = await uploadVoiceMessage({ buffer: req.file.buffer, userId: req.user.id, format });
  res.status(201).json({ data: { mediaUrl, mediaType: "audio" as const } });
}
