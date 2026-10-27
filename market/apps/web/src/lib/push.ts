"use client";

/**
 * Browser Web Push helpers. Nothing here asks for permission by itself:
 * Notification.requestPermission() is only called from an explicit click.
 */

import { isIosDevice, isStandalone } from "./pwa";

export type PushSupport = "supported" | "unsupported" | "needs-install" | "insecure";

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (isIosDevice() && !isStandalone()) return "needs-install";
  const apis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (apis) return "supported";
  // iPhone and iPad only offer Web Push to web apps added to the Home Screen.
  return "unsupported";
}

export function getPermission(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.byteLength) return false;
  const view = new Uint8Array(a);
  return view.every((value, i) => value === b[i]);
}

export async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  return navigator.serviceWorker.getRegistration("/");
}

export async function getBrowserSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

const SUBSCRIBE_TIMEOUT_MS = 30_000;

/** Registers the service worker and returns a push subscription for this store's VAPID key. */
export async function subscribeBrowser(publicKey: string): Promise<PushSubscription> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const registration = await navigator.serviceWorker.ready;
  const key = urlBase64ToBytes(publicKey);
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    if (sameKey(existing.options.applicationServerKey, key)) return existing;
    // The store rotated its keys: the old subscription can no longer receive messages.
    await existing.unsubscribe();
  }
  // Some browsers never settle when their push service is unreachable; don't leave the button spinning.
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("Your browser's push service didn't respond. Please try again in a moment.")), SUBSCRIBE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

/* ------------------------------------------------- Opt-in invitation memory */

const PROMPT_KEY = "aba:push-invite";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const VISIT_KEY = "aba:visit-start";

/** "Not now" hides the invitation for two weeks on this browser. */
export function snoozeInvite(): void {
  try {
    localStorage.setItem(PROMPT_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the invitation may show again next visit.
  }
}

export function isInviteSnoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(PROMPT_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/** Milliseconds since this visit started, counted across page loads in the same tab. */
export function visitElapsedMs(): number {
  try {
    const stored = Number(sessionStorage.getItem(VISIT_KEY));
    if (Number.isFinite(stored) && stored > 0) return Date.now() - stored;
    sessionStorage.setItem(VISIT_KEY, String(Date.now()));
  } catch {
    // Fall through: count from now.
  }
  return 0;
}
