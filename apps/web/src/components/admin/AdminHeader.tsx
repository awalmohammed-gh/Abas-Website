"use client";

import { usePathname } from "next/navigation";
import { FiMenu } from "react-icons/fi";
import { useAdminSession } from "./AdminSession";
import { ADMIN_NAV, isNavActive } from "./AdminSidebar";

export function AdminHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { admin } = useAdminSession();
  const current = ADMIN_NAV.find((item) => isNavActive(pathname, item.href, item.exact));
  const title = pathname.endsWith("/edit") ? "Edit product" : current?.label ?? "Admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-1 inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-brand-50 lg:hidden"
        aria-label="Open admin menu"
      >
        <FiMenu className="size-6" />
      </button>
      <p className="truncate font-display text-lg font-semibold text-ink">{title}</p>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight text-ink">{admin.name}</p>
          <p className="text-xs text-muted">{admin.email}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-cream" aria-hidden="true">
          {admin.name.charAt(0).toUpperCase()}
        </span>
      </div>
    </header>
  );
}
