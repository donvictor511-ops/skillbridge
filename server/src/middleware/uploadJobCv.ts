import multer from "multer";
import { AppError } from "../utils/appError";

const allowedMimeTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new AppError(400, "INVALID_CV_TYPE", "Upload a PDF or DOCX CV (maximum 10 MB)."));
      return;
    }
    callback(null, true);
  },
});

export const uploadSingleJobCv = upload.single("cv");
