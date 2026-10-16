import type { RequestHandler } from "express";
import type { z } from "zod";
import { objectIdSchema } from "@aba-mart/shared";
import { ApiError } from "../utils/ApiError.js";

/** Validates and replaces req.body with the parsed (trimmed, defaulted) value. */
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}

/** Rejects requests whose :id route parameter is not a valid ObjectId. */
export const validateIdParam: RequestHandler = (req, _res, next) => {
  if (!objectIdSchema.safeParse(req.params.id).success) {
    next(ApiError.badRequest("The id provided is not valid."));
    return;
  }
  next();
};

/** Parses a query string with a schema (Express 5 query objects are read-only). */
export function parseQuery<S extends z.ZodType>(schema: S, query: unknown): z.output<S> {
  return schema.parse(query ?? {});
}
