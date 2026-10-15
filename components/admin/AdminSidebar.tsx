"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { FiBox, FiExternalLink, FiGrid, FiHome, FiImage, FiLayers, FiLogOut, FiPlusSquare, FiSettings, FiShoppingCart } from "react-icons/fi";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { useAdminSession } from "./AdminSession";

export const ADMIN_NAV: { label: string; href: string; icon: IconType; exact?: boolean }[] = [
  { label: "Overview", href: "/admin", icon: FiHome, exact: true },
  { label: "Products", href: "/admin/products", icon: FiBox, exact: true },
  { label: "Add Product", href: "/admin/products/new", icon: FiPlusSquare, exact: true },
  { label: "Categories", href: "/admin/categories", icon: FiGrid },
  { label: "Orders", href: "/admin/orders", icon: FiShoppingCart },
  { label: "Inventory", href: "/admin/inventory", icon: FiLayers },
  { label: "Banners", href: "/admin/banners", icon: FiImage },
  { label: "Settings", href: "/admin/settings", icon: FiSettings },
];

export function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href || (href === "/admin/products" && /^\/admin\/products\/[^/]+\/edit$/.test(pathname));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAdminSession();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-brand-deep text-cream">
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
        <Link href="/admin" onClick={onNavigate} aria-label="Admin overview">
          <Logo tone="dark" />
        </Link>
      </div>
      <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <ul className="space-y-1">
          {ADMIN_NAV.map(({ label, href, icon: Icon, exact }) => {
            const active = isNavActive(pathname, href, exact);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-white/12 text-white" : "text-cream/75 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-[18px]", active ? "text-accent" : "")} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream/75 hover:bg-white/8 hover:text-white"
        >
          <FiExternalLink className="size-[18px]" aria-hidden="true" /> View store
        </a>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream/75 hover:bg-white/8 hover:text-white"
        >
          <FiLogOut className="size-[18px]" aria-hidden="true" /> Logout
        </button>
      </div>
    </div>
  );
}
