"use client";

import { useEffect, type ReactNode } from "react";
import { ensurePwaApp } from "@/lib/pwaHead";
import { PwaInstallPrompt } from "@/components/layout/PwaInstallPrompt";

/** Also covers /admin/login, before the authenticated dashboard shell mounts. */
export function AdminPwaShell({ children }: { children: ReactNode }) {
  useEffect(() => { ensurePwaApp("admin"); }, []);
  return <>{children}<PwaInstallPrompt app="admin" /></>;
}
