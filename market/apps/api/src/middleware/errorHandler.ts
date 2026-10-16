import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import { flattenIssues, type ApiErrorBody } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, "ROUTE_NOT_FOUND", `No route for ${req.method} ${req.path}`));
};

function body(code: string, message: string, details?: unknown): ApiErrorBody {
  return { success: false, error: details === undefined ? { code, message } : { code, message, details } };
}

/**
 * Converts every error into the standard JSON shape. Raw database errors and
 * stack traces are logged on the server and never sent to clients.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    res.status(err.statusCode).json(body(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json(body("VALIDATION_ERROR", "Some fields need attention.", { fields: flattenIssues(err.issues) }));
    return;
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    res
      .status(tooLarge ? 413 : 400)
      .json(body(tooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR", tooLarge ? `Images must be ${env.MAX_UPLOAD_MB} MB or smaller.` : "The upload could not be processed."));
    return;
  }

  if (err instanceof mongoose.Error.VersionError) {
    res.status(409).json(body("STALE_WRITE", "This record was changed by someone else. Reload and try again."));
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json(body("INVALID_ID", "The id provided is not valid."));
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message]));
    res.status(400).json(body("VALIDATION_ERROR", "Some fields need attention.", { fields }));
    return;
  }

  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    const keys = Object.keys((err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {});
    res.status(409).json(body("DUPLICATE", keys.length ? `That ${keys.join(", ")} is already in use.` : "That value is already in use.", { fields: keys }));
    return;
  }

  // Body parser errors (malformed JSON, payload too large).
  if (typeof err === "object" && err !== null && "type" in err) {
    const type = (err as { type?: string }).type;
    if (type === "entity.parse.failed") {
      res.status(400).json(body("INVALID_JSON", "The request body is not valid JSON."));
      return;
    }
    if (type === "entity.too.large") {
      res.status(413).json(body("PAYLOAD_TOO_LARGE", "The request is too large."));
      return;
    }
  }

  if (!env.isTest) console.error("[error]", err);
  res.status(500).json(body("INTERNAL_ERROR", "Something went wrong on our side. Please try again."));
};
