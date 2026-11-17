import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

// A "null character" (code 0) is invisible, and PostgreSQL does not allow it
// inside text. If it reached the database, the database would refuse it and we
// would answer with a 500 error ("our fault"). It is really the caller's
// mistake, so we stop it at the door with a clear 400.
function containsNullCharacter(value: unknown): boolean {
  if (typeof value === "string") {
    return value.includes("\u0000");
  }

  if (Array.isArray(value)) {
    return value.some((item: unknown) => containsNullCharacter(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(
      ([key, inner]) => key.includes("\u0000") || containsNullCharacter(inner),
    );
  }

  return false;
}

export function rejectNullCharacters(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (containsNullCharacter(req.body)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "The request contains characters that are not allowed.",
      [
        {
          field: "body",
          message:
            "Remove the invisible control character (code 0) from your text.",
        },
      ],
    );
  }

  next();
}
