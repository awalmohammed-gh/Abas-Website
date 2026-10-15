export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Please sign in to continue.", code = "UNAUTHENTICATED") {
    return new ApiError(401, code, message);
  }

  static forbidden(message = "You do not have permission to do that.", code = "FORBIDDEN") {
    return new ApiError(403, code, message);
  }

  static notFound(message = "The requested resource was not found.") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, code = "CONFLICT", details?: unknown) {
    return new ApiError(409, code, message, details);
  }

  static unprocessable(message: string, code = "UNPROCESSABLE", details?: unknown) {
    return new ApiError(422, code, message, details);
  }
}
