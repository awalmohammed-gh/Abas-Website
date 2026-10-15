import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import mongoose, { type ClientSession } from "mongoose";
import { env } from "../config/env.js";
import { CustomerSession, type CustomerSessionDoc } from "../models/CustomerSession.js";
import { ApiError } from "../utils/ApiError.js";
import { csrfTokenFor } from "./authService.js";

export const CUSTOMER_COOKIE = "aba_guest_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const RECOVERY_MS = 180 * 24 * 60 * 60 * 1000;
const secret = () => randomBytes(32).toString("base64url");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function customerCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction || env.cookieSecure,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/api",
    maxAge: SESSION_MS,
    // Keep this cookie host-only instead of sharing it with every store subdomain.
  };
}

export function guestCsrf(session: CustomerSessionDoc): string {
  return csrfTokenFor(`guest:${session.sessionIdHash}`);
}

export async function resolveCustomerSession(req: Request): Promise<CustomerSessionDoc | null> {
  const raw: unknown = req.cookies?.[CUSTOMER_COOKIE];
  if (typeof raw !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  return CustomerSession.findOne({ sessionIdHash: hash(raw), expiresAt: { $gt: new Date() } }).lean<CustomerSessionDoc>();
}

export async function createCustomerSession(res: Response): Promise<CustomerSessionDoc> {
  const raw = secret();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MS);
  const session = await CustomerSession.create({ sessionIdHash: hash(raw), expiresAt, purgeAfter: expiresAt, lastActiveAt: now });
  res.cookie(CUSTOMER_COOKIE, raw, customerCookieOptions());
  return session.toObject();
}

export function activeGuestFilter(session: CustomerSessionDoc) {
  return { _id: session._id, sessionIdHash: session.sessionIdHash, expiresAt: { $gt: new Date() } };
}

async function revokeCustomerSession(session: CustomerSessionDoc, transaction: ClientSession): Promise<void> {
  await CustomerSession.updateOne(activeGuestFilter(session), {
    $set: { sessionIdHash: hash(secret()), expiresAt: new Date(0) },
  }, { session: transaction });
}

export async function resetCustomerSession(current: CustomerSessionDoc, res: Response): Promise<CustomerSessionDoc> {
  const raw = secret();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const next = await mongoose.connection.transaction(async (transaction) => {
    const active = await CustomerSession.findOne(activeGuestFilter(current)).session(transaction);
    if (!active) throw ApiError.unauthorized("Your guest session has ended.", "GUEST_SESSION_EXPIRED");
    await revokeCustomerSession(current, transaction);
    const [created] = await CustomerSession.create([{
      sessionIdHash: hash(raw), expiresAt, purgeAfter: expiresAt, lastActiveAt: new Date(),
    }], { session: transaction });
    return created!.toObject();
  });
  res.cookie(CUSTOMER_COOKIE, raw, customerCookieOptions());
  return next;
}

export async function issueRecoveryToken(session: CustomerSessionDoc): Promise<{ token: string; expiresAt: string }> {
  const token = secret();
  const expiresAt = new Date(Date.now() + RECOVERY_MS);
  const result = await CustomerSession.updateOne(activeGuestFilter(session), {
    $set: { recoveryTokenHash: hash(token), recoveryExpiresAt: expiresAt, purgeAfter: expiresAt },
  });
  if (!result.matchedCount) throw ApiError.unauthorized("Your guest session has ended. Reload the page.");
  return { token, expiresAt: expiresAt.toISOString() };
}

/** A recovery code is a one-use bearer secret; recovery switches sessions without merging orders. */
export async function recoverCustomerSession(token: string, current: CustomerSessionDoc, res: Response): Promise<CustomerSessionDoc> {
  const raw = secret();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const recovered = await mongoose.connection.transaction(async (transaction) => {
    const active = await CustomerSession.findOne(activeGuestFilter(current)).session(transaction);
    if (!active) throw ApiError.unauthorized("Your guest session has ended.", "GUEST_SESSION_EXPIRED");
    const restored = await CustomerSession.findOneAndUpdate(
    { recoveryTokenHash: hash(token), recoveryExpiresAt: { $gt: new Date() } },
    { $set: {
      sessionIdHash: hash(raw), expiresAt, purgeAfter: expiresAt, lastActiveAt: new Date(),
      recoveryTokenHash: null, recoveryExpiresAt: null,
    } },
    { returnDocument: "after", session: transaction },
  ).lean<CustomerSessionDoc>();
    if (!restored) throw new ApiError(400, "RECOVERY_INVALID", "This recovery code is invalid, expired or already used.");
    if (!restored._id.equals(current._id)) await revokeCustomerSession(current, transaction);
    return restored;
  });
  res.cookie(CUSTOMER_COOKIE, raw, customerCookieOptions());
  return recovered;
}
