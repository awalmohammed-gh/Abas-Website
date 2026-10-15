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

/** Slide-in drawer for phones and tablets. Escape, the backdrop and every link close it. */
export function MobileNavbar({ open, onClose, storeName, logo, pathname, categories, chatUrl, supportPhone }: MobileNavbarProps) {
  const [categoriesOpen, setCategoriesOpen] = useState(pathname.startsWith("/categories"));
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors",
      active ? "bg-brand-50 text-brand" : "text-ink hover:bg-cream",
    );

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu" id="mobile-menu">
      <div className="absolute inset-0 animate-fade-in bg-brand-deep/45" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-slide-in flex-col bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <Logo storeName={storeName} logo={logo} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-brand-50"
            aria-label="Close menu"
          >
            <FiX className="size-6" />
          </button>
        </div>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
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
                            "flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px]",
                            pathname === href ? "font-semibold text-brand" : "text-ink hover:bg-cream",
                          )}
                        >
                          {category.name}
                          <span className="text-xs text-muted">{category.count}</span>
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

        <div className="space-y-2 border-t border-line p-4">
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
    </div>
  );
}
