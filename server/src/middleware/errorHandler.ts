import type { NextFunction, Request, Response } from "express";
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

// Express's JSON body reader marks its errors with a "type" text.
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

// Never write passwords, tokens, or personal data to logs.
// In development we print the full error to help you debug.
// Elsewhere we print only the error's name.
function logUnexpectedError(error: unknown): void {
  if (env.nodeEnv === "test") {
    return;
  }
  if (env.nodeEnv === "development") {
    console.error(error);
    return;
  }
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error(`Unexpected error: ${name}`);
}

function sendError(
  res: Response,
  statusCode: number,
  body: ErrorResponseBody,
): void {
  res.status(statusCode).json(body);
}

// Express recognizes an error handler by its FOUR parameters.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // If a response was already started, let Express finish it.
  if (res.headersSent) {
    next(err);
    return;
  }

  // 1. Input did not pass Zod validation -> 400
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

  // 2. An error we raised on purpose (duplicate email, and so on)
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

  // 3. The request body could not be read
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

  // 4. Anything else is our bug. Log it safely, reply with a safe message.
  logUnexpectedError(err);
  sendError(res, 500, {
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  });
}
