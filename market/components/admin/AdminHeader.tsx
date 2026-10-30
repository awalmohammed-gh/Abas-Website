"use client";

import { usePathname } from "next/navigation";
import { FiChevronRight, FiMenu } from "react-icons/fi";
import { AdminNotificationBell } from "./AdminNotificationBell";
import { useAdminSession } from "./AdminSession";
import { ADMIN_NAV, isNavActive } from "./AdminSidebar";
import { InstallPwaButton } from "@/components/ui/InstallPwaButton";

export function AdminHeader({ onOpenMenu, menuOpen }: { onOpenMenu: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const { admin } = useAdminSession();
  const current = ADMIN_NAV.find((item) => isNavActive(pathname, item.href, item.exact));
  const title = pathname.endsWith("/edit") ? "Edit product" : current?.label ?? "Admin";

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex min-h-20 min-w-0 items-center gap-3 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-brand-50 lg:hidden"
        aria-label="Open admin menu"
        aria-expanded={menuOpen}
        aria-controls="admin-menu"
      >
        <FiMenu className="size-6" />
      </button>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden text-muted md:inline">Workspace</span>
        <FiChevronRight aria-hidden="true" className="hidden size-3.5 shrink-0 text-muted/60 md:block" />
        <p className="min-w-0 truncate font-display text-base font-semibold text-ink">{title}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <InstallPwaButton variant="admin-header" />
        <AdminNotificationBell />
        <div className="hidden min-w-0 text-right sm:block">
          <p className="text-sm font-semibold leading-tight text-ink">{admin.name}</p>
          <p className="text-xs text-muted">{admin.email}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-cream" aria-hidden="true">
          {admin.name.charAt(0).toUpperCase()}
        </span>
      </div>
      </div>
    </header>
  );
}
