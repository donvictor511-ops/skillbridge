import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import type { ErrorDetail } from "../utils/appError";

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

function getBodyParserErrorType(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    typeof error.type === "string"
  ) {
    return error.type;
  }

  return null;
}

function logUnexpectedError(error: unknown, requestPath: string): void {
  if (env.nodeEnv === "test") {
    return;
  }

  if (env.nodeEnv === "development") {
    console.error(error);
    return;
  }

  const name = error instanceof Error ? error.name : "UnknownError";
  const details: Record<string, unknown> = { name, path: requestPath };

  // Log only safe database identifiers. Never log the full error, SQL,
  // request body, or credentials.
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    if (typeof code === "string" && /^P\d{4}$/.test(code)) {
      details.code = code;
      if ("meta" in error && typeof error.meta === "object" && error.meta !== null) {
        const meta = error.meta;
        if ("modelName" in meta && typeof meta.modelName === "string") {
          details.model = meta.modelName;
        }
        if ("column_name" in meta && typeof meta.column_name === "string") {
          details.column = meta.column_name;
        } else if ("column" in meta && typeof meta.column === "string") {
          details.column = meta.column;
        }
      }
    }
  }

  console.error("Unexpected error:", JSON.stringify(details));
}

function sendError(
  res: Response,
  statusCode: number,
  body: ErrorResponseBody,
): void {
  res.status(statusCode).json(body);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  // 1. Zod validation errors
  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.map(String).join(".") : "body",
      message: issue.message,
    }));

    sendError(res, 400, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the highlighted fields.",
        details,
      },
    });
    return;
  }

  // 2. Errors raised intentionally by our application
  if (err instanceof AppError) {
    sendError(res, err.statusCode, {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 3. Multer upload errors
  if (err instanceof multer.MulterError) {
    const isTooLarge = err.code === "LIMIT_FILE_SIZE";
    const isPostMedia = req.path.endsWith("/posts/media");
    const isAudioMessage = req.path.endsWith("/messages/audio") || req.path.endsWith("/calls/audio");

    sendError(res, isTooLarge ? 413 : 400, {
      error: {
        code: isTooLarge
          ? isPostMedia
            ? "MEDIA_TOO_LARGE"
            : isAudioMessage ? "AUDIO_TOO_LARGE" : "IMAGE_TOO_LARGE"
          : "IMAGE_UPLOAD_ERROR",
        message: isTooLarge
          ? isPostMedia
            ? "Post media must not exceed 25 MB."
            : isAudioMessage ? "A voice message must not exceed 12 MB." : "The image must not exceed 5 MB."
          : "The image could not be accepted. Please check your upload and try again.",
      },
    });
    return;
  }

  // 4. JSON body parser errors
  const bodyErrorType = getBodyParserErrorType(err);

  if (bodyErrorType === "entity.parse.failed") {
    sendError(res, 400, {
      error: {
        code: "INVALID_JSON",
        message: "The request body is not valid JSON.",
      },
    });
    return;
  }

  if (bodyErrorType === "entity.too.large") {
    sendError(res, 413, {
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
      },
    });
    return;
  }

  // 5. Unexpected errors
  logUnexpectedError(err, req.path);

  sendError(res, 500, {
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  });
}
