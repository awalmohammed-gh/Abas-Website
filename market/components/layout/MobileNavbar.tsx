"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiChevronDown, FiPhone, FiX } from "react-icons/fi";
import type { ImageAsset } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import type { NavCategory } from "./Navbar";
import { InstallPwaButton } from "@/components/ui/InstallPwaButton";
import { useScrollLock } from "@/hooks/useScrollLock";

interface MobileNavbarProps {
  open: boolean;
  onClose: () => void;
  storeName: string;
  logo: ImageAsset | null;
  pathname: string;
  categories: NavCategory[];
  chatUrl: string | null;
  supportPhone: string;
}

/** Viewport-bound top menu. Native dialog focus handling keeps the background inert. */
export function MobileNavbar({ open, onClose, storeName, logo, pathname, categories, chatUrl, supportPhone }: MobileNavbarProps) {
  const [categoriesOpen, setCategoriesOpen] = useState(pathname.startsWith("/categories"));
  const dialogRef = useRef<HTMLDialogElement>(null);
  useScrollLock(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open, onClose]);

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors",
      active ? "bg-brand-50 text-brand" : "text-ink hover:bg-cream",
    );

  return (
    <dialog
      ref={dialogRef}
      aria-label="Menu"
      id="mobile-menu"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}
      className="mobile-menu fixed inset-x-0 top-0 bottom-auto m-0 h-fit max-h-dvh w-full max-w-none border-0 bg-transparent p-0"
    >
      <div className="flex max-h-dvh min-w-0 flex-col rounded-b-2xl bg-white shadow-pop">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <Logo storeName={storeName} logo={logo} />
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-brand-50"
            aria-label="Close menu"
          >
            <FiX className="size-6" />
          </button>
        </div>

        <nav aria-label="Mobile" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <ul className="space-y-1">
            {siteConfig.mainNav.slice(0, 2).map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onClose} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className={linkClass(pathname.startsWith("/categories")) + " w-full"}
                aria-expanded={categoriesOpen}
                onClick={() => setCategoriesOpen((v) => !v)}
              >
                Categories
                <FiChevronDown className={cn("size-5 transition-transform", categoriesOpen && "rotate-180")} aria-hidden="true" />
              </button>
              {categoriesOpen && (
                <ul className="mt-1 space-y-0.5 border-l-2 border-brand-100 pl-3 ml-4">
                  {categories.length === 0 && <li className="px-3 py-2 text-sm text-muted">No categories yet</li>}
                  {categories.map((category) => {
                    const href = `/categories/${category.slug}`;
                    return (
                      <li key={category.slug}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={cn(
                            "flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[15px]",
                            pathname === href ? "font-semibold text-brand" : "text-ink hover:bg-cream",
                          )}
                        >
                          <span className="min-w-0">{category.name}</span>
                          <span className="shrink-0 text-xs text-muted">{category.count}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
            {siteConfig.mainNav.slice(2).map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onClose} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/cart" onClick={onClose} className={linkClass(pathname === "/cart")}>
                Cart
              </Link>
            </li>
          </ul>
        </nav>

        <div className="shrink-0 space-y-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <InstallPwaButton variant="mobile" onInstalled={onClose} />
          {chatUrl && (
            <a
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp font-semibold text-white"
            >
              <FaWhatsapp className="size-5" aria-hidden="true" /> Chat on WhatsApp
            </a>
          )}
          {supportPhone && (
            <a href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium text-ink">
              <FiPhone className="size-4" aria-hidden="true" /> {supportPhone}
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
}
