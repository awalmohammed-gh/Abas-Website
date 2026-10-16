import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

// Dashboard pages only render after the client confirms the admin session,
// so they are intentionally excluded from instant-navigation validation.
export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
