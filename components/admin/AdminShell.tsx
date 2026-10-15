"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { AdminHeader } from "./AdminHeader";
import { AdminSessionProvider } from "./AdminSession";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <AdminSessionProvider>
      <div className="flex min-h-dvh bg-cream">
        <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
          <AdminSidebar />
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="absolute inset-0 animate-fade-in bg-brand-deep/50" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-slide-in shadow-pop">
              <AdminSidebar onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-xl text-cream hover:bg-white/10"
                aria-label="Close admin menu"
              >
                <FiX className="size-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <AdminHeader onOpenMenu={() => setMenuOpen(true)} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminSessionProvider>
  );
}
