export interface ErrorDetail {
  field: string;
  message: string;
}

// An error we expect and know how to explain to the user (wrong input,
// duplicate email, and so on). The error handler turns it into a response.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetail[] | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
