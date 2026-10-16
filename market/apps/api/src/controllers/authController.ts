import type { Request, Response } from "express";
import type { AdminSession } from "@aba-mart/shared";
import { resolveSession } from "../middleware/adminAuth.js";
import {
  SESSION_COOKIE,
  authenticate,
  clearedCookieOptions,
  csrfTokenFor,
  isValidCsrfToken,
  revokeSessions,
  sessionCookieOptions,
  signSession,
  toAdminDTO,
} from "../services/authService.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/respond.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const admin = await authenticate(email, password);
  const { token, claims } = signSession(admin);

  res.setHeader("Cache-Control", "no-store");
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  sendSuccess<AdminSession>(res, {
    admin: toAdminDTO(admin),
    csrfToken: csrfTokenFor(claims.jti),
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  });
}

/** Ends the session server-side (token version bump) and clears the cookie. */
export async function logout(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { admin, session } = await resolveSession(req);
    if (!isValidCsrfToken(session.jti, req.get("x-csrf-token"))) {
      throw ApiError.forbidden("Your security token is missing or out of date.", "CSRF_INVALID");
    }
    await revokeSessions(admin.id);
  } catch (error) {
    // An expired or missing session is already logged out; anything else is a real error.
    if (!(error instanceof ApiError) || error.statusCode !== 401) throw error;
  }
  res.clearCookie(SESSION_COOKIE, clearedCookieOptions());
  sendSuccess(res, { loggedOut: true });
}

export async function me(req: Request, res: Response) {
  const session = req.adminSession!;
  sendSuccess<AdminSession>(res, {
    admin: { ...req.admin! },
    csrfToken: csrfTokenFor(session.jti),
    expiresAt: new Date(session.exp * 1000).toISOString(),
  });
}
