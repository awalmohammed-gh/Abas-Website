import type { GuestSessionDTO } from "@aba-mart/shared";
import { ApiClientError, apiRequest, setGuestCsrfToken } from "./api";

export const GUEST_CHANGED_EVENT = "aba:guest-changed";
let session: GuestSessionDTO | null = null;
let pending: Promise<GuestSessionDTO> | null = null;

export function acceptGuestSession(next: GuestSessionDTO): void {
  const changed = session !== null && session.csrfToken !== next.csrfToken;
  session = next;
  setGuestCsrfToken(next.csrfToken);
  if (changed) window.dispatchEvent(new Event(GUEST_CHANGED_EVENT));
}

export function ensureGuestSession(force = false): Promise<GuestSessionDTO> {
  if (pending) return pending;
  if (!force && session && Date.parse(session.expiresAt) > Date.now()) return Promise.resolve(session);
  const load = async () => {
    const next = await apiRequest<GuestSessionDTO>("/customer/session");
    acceptGuestSession(next);
    return next;
  };
  // Serialize first-visit cookie creation across tabs when Web Locks is available.
  const work = (async () => {
    if (typeof navigator !== "undefined" && navigator.locks) return await navigator.locks.request("aba-guest-bootstrap", load);
    return await load();
  })().finally(() => { pending = null; });
  pending = work;
  return work;
}

async function guestRequest<T>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  await ensureGuestSession();
  try {
    return await apiRequest<T>(path, { method, body });
  } catch (error) {
    if (error instanceof ApiClientError && (error.code === "GUEST_SESSION_EXPIRED" || error.code === "GUEST_CSRF_INVALID")) {
      session = null;
      setGuestCsrfToken(null);
      window.dispatchEvent(new Event(GUEST_CHANGED_EVENT));
    }
    throw error;
  }
}

export const guestApi = {
  get: <T>(path: string) => guestRequest<T>(path, "GET"),
  post: <T>(path: string, body?: unknown) => guestRequest<T>(path, "POST", body),
  put: <T>(path: string, body?: unknown) => guestRequest<T>(path, "PUT", body),
  patch: <T>(path: string, body?: unknown) => guestRequest<T>(path, "PATCH", body),
  delete: <T>(path: string) => guestRequest<T>(path, "DELETE"),
};
