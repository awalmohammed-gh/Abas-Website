"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import type { StoreSettingsDTO } from "@aba-mart/shared";
import { AdminHeader } from "./AdminHeader";
import { AdminSessionProvider } from "./AdminSession";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useScrollLock } from "@/hooks/useScrollLock";
import { onStoreEvent } from "@/lib/storeChannel";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminFrame>{children}</AdminFrame>
    </AdminSessionProvider>
  );
}

/** Rendered only after the session check, so the branding request is authenticated. */
function AdminFrame({ children }: { children: ReactNode }) {
  const branding = useAdminResource<StoreSettingsDTO>("/admin/settings");
  const { reload } = branding;
  const storeName = branding.data?.storeName;
  const logo = branding.data?.logo ?? null;
  // Show a newly uploaded logo or store name as soon as settings are saved in any tab.
  useEffect(() => onStoreEvent((event) => { if (event.type === "settings") reload(); }), [reload]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  useScrollLock(menuOpen);

  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <>
      <div className="flex min-h-dvh min-w-0 bg-cream">
        <aside className={cn("fixed inset-y-3 left-3 z-40 hidden overflow-hidden rounded-2xl border border-brand-deep/10 shadow-card motion-safe:transition-[width] motion-safe:duration-200 lg:block", sidebarCollapsed ? "w-20" : "w-64")}>
          <AdminSidebar storeName={storeName} logo={logo} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)} />
        </aside>

          <dialog
            ref={menuRef}
            id="admin-menu"
            aria-label="Admin menu"
            onCancel={(event) => { event.preventDefault(); setMenuOpen(false); }}
            onClick={(event) => { if (event.target === menuRef.current) setMenuOpen(false); }}
            className="mobile-menu admin-menu fixed inset-y-0 left-0 right-auto z-50 m-0 h-dvh max-h-dvh w-[min(20rem,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-r-2xl border-0 bg-transparent p-0"
          >
            <div className="relative h-full min-h-0 min-w-0 shadow-pop">
              <AdminSidebar onNavigate={() => setMenuOpen(false)} storeName={storeName} logo={logo} />
              <button
                type="button"
                autoFocus
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-[calc(1.625rem+env(safe-area-inset-top))] inline-flex size-11 items-center justify-center rounded-xl text-cream hover:bg-white/10 focus-visible:outline-white"
                aria-label="Close admin menu"
              >
                <FiX className="size-5" />
              </button>
            </div>
          </dialog>

        <div className={cn("flex min-w-0 flex-1 flex-col motion-safe:transition-[padding-left] motion-safe:duration-200", sidebarCollapsed ? "lg:pl-[6.5rem]" : "lg:pl-[17.5rem]")}>
          <AdminHeader onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
          <main className="min-w-0 flex-1 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:pt-8 lg:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pl-[max(2rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))]">{children}</main>
        </div>
      </div>
    </>
  );
}
