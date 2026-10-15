"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AdminSession, AdminUserDTO } from "@aba-mart/shared";
import { BrandMark } from "@/components/brand/Logo";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError, SESSION_EXPIRED_EVENT, api, setCsrfToken } from "@/lib/api";

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

  const toLogin = useCallback(
    (reason?: "expired") => {
      setCsrfToken(null);
      const params = new URLSearchParams({ next: pathname });
      if (reason) params.set("reason", reason);
      router.replace(`/admin/login?${params.toString()}`);
    },
    [pathname, router],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .get<AdminSession>("/admin/auth/me")
      .then((result) => {
        if (cancelled) return;
        setCsrfToken(result.csrfToken);
        setSession(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) toLogin(error instanceof ApiClientError && error.code === "SESSION_EXPIRED" ? "expired" : undefined);
      });
    return () => {
      cancelled = true;
    };
    // Only check once when the dashboard mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onExpired = () => toLogin("expired");
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [toLogin]);

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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream text-brand">
        <BrandMark className="size-12" />
        <Spinner label="Checking your session" />
      </div>
    );
  }

  return <AdminSessionContext.Provider value={{ admin: session.admin, logout }}>{children}</AdminSessionContext.Provider>;
}
