"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { AdminHeader } from "./AdminHeader";
import { AdminSessionProvider } from "./AdminSession";
import { AdminSidebar } from "./AdminSidebar";
import { useScrollLock } from "@/hooks/useScrollLock";

export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
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
    <AdminSessionProvider>
      <div className="flex min-h-dvh min-w-0 bg-cream">
        <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
          <AdminSidebar />
        </aside>

          <dialog
            ref={menuRef}
            id="admin-menu"
            aria-label="Admin menu"
            onCancel={(event) => { event.preventDefault(); setMenuOpen(false); }}
            onClick={(event) => { if (event.target === menuRef.current) setMenuOpen(false); }}
            className="mobile-menu fixed inset-x-0 top-0 bottom-auto m-0 h-[min(100dvh,40rem)] max-h-dvh w-full max-w-none border-0 bg-transparent p-0"
          >
            <div className="relative h-full min-h-0 min-w-0 shadow-pop">
              <AdminSidebar onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                autoFocus
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-xl text-cream hover:bg-white/10"
                aria-label="Close admin menu"
              >
                <FiX className="size-5" />
              </button>
            </div>
          </dialog>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <AdminHeader onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminSessionProvider>
  );
}
