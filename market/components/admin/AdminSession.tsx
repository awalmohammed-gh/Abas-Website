"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AdminSession, AdminUserDTO } from "@aba-mart/shared";
import { BrandMark } from "@/components/brand/Logo";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError, SESSION_EXPIRED_EVENT, api, errorMessage, setCsrfToken } from "@/lib/api";

interface AdminSessionValue {
  admin: AdminUserDTO;
  logout: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession(): AdminSessionValue {
  const context = useContext(AdminSessionContext);
  if (!context) throw new Error("useAdminSession must be used inside <AdminSessionProvider>");
  return context;
}

/**
 * Client-side gate for the dashboard UI. It is a convenience only: every admin
 * API route checks the session cookie and CSRF token on the server.
 */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loginHref = `/admin/login?${new URLSearchParams({ next: pathname }).toString()}`;

  const toLogin = useCallback(
    (reason?: "expired") => {
      setCsrfToken(null);
      setSession(null);
      const params = new URLSearchParams({ next: pathname });
      if (reason) params.set("reason", reason);
      router.replace(`/admin/login?${params.toString()}`);
    },
    [pathname, router],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    api
      .get<AdminSession>("/admin/auth/me", controller.signal)
      .then((result) => {
        if (cancelled) return;
        setCsrfToken(result.csrfToken);
        setSession(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.status === 401) {
          toLogin(error.code === "SESSION_EXPIRED" ? "expired" : undefined);
        } else {
          setCheckError(errorMessage(error));
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt, toLogin]);

  useEffect(() => {
    if (!session) return;
    const onExpired = () => toLogin("expired");
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [session, toLogin]);

  // Leave the dashboard when the session reaches its expiry time.
  useEffect(() => {
    if (!session) return;
    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => toLogin("expired"), Math.max(0, Math.min(remaining, 2_147_000_000)));
    return () => window.clearTimeout(timer);
  }, [session, toLogin]);

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/auth/logout");
    } finally {
      setCsrfToken(null);
      router.replace("/admin/login");
    }
  }, [router]);

  if (!session) {
    return (
      <div className="flex min-h-dvh min-w-0 items-center justify-center bg-cream px-4 py-8 text-brand">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <BrandMark className="size-16" />
          {checkError ? (
            <>
              <h1 className="text-xl font-semibold text-ink">Unable to open admin</h1>
              <p role="alert" className="text-sm text-muted">{checkError}</p>
              <Button onClick={() => { setCheckError(null); setAttempt((value) => value + 1); }}>Try again</Button>
            </>
          ) : (
            <Spinner label="Checking your session" />
          )}
          <Link href={loginHref} className={buttonClasses("secondary")}>Go to admin sign in</Link>
        </div>
      </div>
    );
  }

  return <AdminSessionContext.Provider value={{ admin: session.admin, logout }}>{children}</AdminSessionContext.Provider>;
}
