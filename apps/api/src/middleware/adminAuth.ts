import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AdminRole } from "@aba-mart/shared";
import { Admin, type AdminDoc } from "../models/Admin.js";
import { SESSION_COOKIE, isValidCsrfToken, verifySessionToken, type SessionClaims } from "../services/authService.js";
import { ApiError } from "../utils/ApiError.js";

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

declare module "express-serve-static-core" {
  interface Request {
    admin?: AuthenticatedAdmin;
    adminSession?: SessionClaims;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Resolves the admin from the HTTP-only session cookie and checks the account is still allowed in. */
export async function resolveSession(req: Request): Promise<{ admin: AuthenticatedAdmin; session: SessionClaims }> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !token) throw ApiError.unauthorized();

  const session = verifySessionToken(token);
  const admin = await Admin.findById(session.sub).select("name email role status tokenVersion").lean<AdminDoc>();

  if (!admin || admin.status !== "active" || admin.tokenVersion !== session.tv) {
    throw ApiError.unauthorized("Your session has ended. Please sign in again.", "SESSION_REVOKED");
  }

  return {
    admin: { id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role },
    session,
  };
}

/** Requires a valid admin session for every request. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  resolveSession(req)
    .then(({ admin, session }) => {
      req.admin = admin;
      req.adminSession = session;
      next();
    })
    .catch(next);
};

/** Requires the per-session CSRF token on state-changing requests. Must run after requireAdmin. */
export const requireCsrf: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!req.adminSession || !isValidCsrfToken(req.adminSession.jti, req.get("x-csrf-token"))) {
    return next(ApiError.forbidden("Your security token is missing or out of date. Reload the page and try again.", "CSRF_INVALID"));
  }
  next();
};

export function requireRole(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return next(ApiError.forbidden("Your account is not allowed to make this change."));
    }
    next();
  };
}

/** Full protection stack for admin routers. */
export const adminOnly = [requireAdmin, requireCsrf] as const;
