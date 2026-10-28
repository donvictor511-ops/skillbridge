import axios from "axios";
import type { ApiErrorBody } from "../types/api";

export interface ApiErrorInfo {
  code: string;
  // Safe to show to the user.
  message: string;
  // field name -> first message for that field
  fieldErrors: Record<string, string>;
}

// Checks that unknown data really has the shape { error: { code, message } }.
function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }

  const error = value.error;

  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

// Turns anything an API call can throw into a safe, friendly structure.
export function getApiErrorInfo(error: unknown): ApiErrorInfo {
  if (axios.isAxiosError(error)) {
    // No response at all: server down, no internet, or a timeout.
    if (!error.response) {
      return {
        code: "NETWORK_ERROR",
        message:
          "We could not reach the server. Check your connection and try again.",
        fieldErrors: {},
      };
    }

    const body: unknown = error.response.data;

    if (isApiErrorBody(body)) {
      const fieldErrors: Record<string, string> = {};

      for (const detail of body.error.details ?? []) {
        if (!(detail.field in fieldErrors)) {
          fieldErrors[detail.field] = detail.message;
        }
      }

      return {
        code: body.error.code,
        message: body.error.message,
        fieldErrors,
      };
    }
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Something went wrong. Please try again.",
    fieldErrors: {},
  };
}
