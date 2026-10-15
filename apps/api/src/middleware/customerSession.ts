import type { RequestHandler } from "express";
import type { CustomerSessionDoc } from "../models/CustomerSession.js";
import { isValidCsrfToken } from "../services/authService.js";
import { resolveCustomerSession } from "../services/customerSessionService.js";
import { ApiError } from "../utils/ApiError.js";

declare module "express-serve-static-core" {
  interface Request {
    customerSession?: CustomerSessionDoc;
  }
}

export const requireCustomer: RequestHandler = (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Origin, Cookie");
  resolveCustomerSession(req).then((session) => {
    if (!session) throw ApiError.unauthorized("Your guest session has ended. Reload the page to start a new visit.", "GUEST_SESSION_EXPIRED");
    req.customerSession = session;
    next();
  }).catch(next);
};

export const requireCustomerCsrf: RequestHandler = (req, _res, next) => {
  if (!req.customerSession || !isValidCsrfToken(`guest:${req.customerSession.sessionIdHash}`, req.get("x-csrf-token"))) {
    return next(ApiError.forbidden("Your guest session changed. Reload the page and try again.", "GUEST_CSRF_INVALID"));
  }
  next();
};
