import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import type { AdminRole, AdminUserDTO } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { Admin, type AdminDoc } from "../models/Admin.js";
import { ApiError } from "../utils/ApiError.js";

export const SESSION_COOKIE = "aba_admin_session";
const ISSUER = "aba-mart-api";
const AUDIENCE = "aba-mart-admin";
const BCRYPT_ROUNDS = 12;

// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync("aba-mart-timing-guard", BCRYPT_ROUNDS);

export interface SessionClaims {
  sub: string;
  role: AdminRole;
  tv: number;
  jti: string;
  exp: number;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: "/api/admin",
    maxAge: env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000,
  };
}

export function clearedCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...rest } = sessionCookieOptions();
  return rest;
}

/**
 * CSRF token bound to one session (its jti). The frontend keeps it in memory
 * and sends it in the X-CSRF-Token header; a cross-site page cannot read it.
 */
export function csrfTokenFor(jti: string): string {
  return createHmac("sha256", env.JWT_SECRET).update(`csrf:${jti}`).digest("base64url");
}

export function isValidCsrfToken(jti: string, token: unknown): boolean {
  if (typeof token !== "string" || token.length > 200) return false;
  const expected = Buffer.from(csrfTokenFor(jti));
  const provided = Buffer.from(token);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function signSession(admin: Pick<AdminDoc, "_id" | "role" | "tokenVersion">): { token: string; claims: SessionClaims } {
  const jti = randomUUID();
  const token = jwt.sign({ role: admin.role, tv: admin.tokenVersion }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: admin._id.toString(),
    jwtid: jti,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: `${env.JWT_EXPIRES_IN_HOURS}h`,
  });
  const claims = jwt.decode(token) as SessionClaims;
  return { token, claims };
}

export function verifySessionToken(token: string): SessionClaims {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload === "string" || !payload.sub || !payload.jti || typeof payload.tv !== "number") {
      throw ApiError.unauthorized("Your session is invalid. Please sign in again.", "SESSION_INVALID");
    }
    return payload as SessionClaims;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized("Your session has expired. Please sign in again.", "SESSION_EXPIRED");
    }
    throw ApiError.unauthorized("Your session is invalid. Please sign in again.", "SESSION_INVALID");
  }
}

export function toAdminDTO(admin: Pick<AdminDoc, "_id" | "name" | "email" | "role">): AdminUserDTO {
  return { id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role };
}

/** Verifies credentials. Always returns the same error for unknown emails, wrong passwords and disabled accounts. */
export async function authenticate(email: string, password: string): Promise<AdminDoc> {
  const admin = await Admin.findOne({ email }).select("+passwordHash").lean<AdminDoc>();
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !valid || admin.status !== "active") {
    throw ApiError.unauthorized("Incorrect email or password.", "INVALID_CREDENTIALS");
  }
  await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  return admin;
}

/** Ends every session for this admin by bumping the token version. */
export async function revokeSessions(adminId: string): Promise<void> {
  await Admin.updateOne({ _id: adminId }, { $inc: { tokenVersion: 1 } });
}
