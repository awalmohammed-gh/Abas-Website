import type { ApiErrorBody, ApiResponse } from "@aba-mart/shared";

const stripSlash = (url: string) => url.replace(/\/+$/, "");

/** Browser-facing API base URL. */
export const API_URL = stripSlash(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api");

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field errors from a VALIDATION_ERROR response, keyed by dotted path. */
  get fieldErrors(): Record<string, string> {
    const fields = (this.details as { fields?: unknown } | undefined)?.fields;
    return fields && typeof fields === "object" && !Array.isArray(fields) ? (fields as Record<string, string>) : {};
  }
}

/*
 * The admin CSRF token lives only in memory (never localStorage). It is
 * returned by login and /me, and sent with every state-changing admin request.
 */
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Fired when an admin request comes back 401 so the dashboard can send the user to login. */
export const SESSION_EXPIRED_EVENT = "aba:session-expired";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (UNSAFE.has(method) && csrfToken && path.startsWith("/admin")) headers["X-CSRF-Token"] = csrfToken;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiClientError(0, "NETWORK_ERROR", "We couldn't reach the store server. Check your connection and try again.");
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !payload.success) {
    const error = (payload as ApiErrorBody | null)?.error;
    if (response.status === 401 && path.startsWith("/admin") && !path.startsWith("/admin/auth/login") && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    throw new ApiClientError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details,
    );
  }
  return payload.data;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
