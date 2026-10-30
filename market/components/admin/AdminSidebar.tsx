"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { FiArrowUpRight, FiBell, FiBox, FiChevronLeft, FiChevronRight, FiGrid, FiHome, FiImage, FiLayers, FiLogOut, FiPlus, FiPlusSquare, FiSettings, FiShoppingCart } from "react-icons/fi";
import type { ImageAsset } from "@aba-mart/shared";
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
  { label: "Notifications", href: "/admin/notifications", icon: FiBell },
  { label: "Settings", href: "/admin/settings", icon: FiSettings },
];

export function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href || (href === "/admin/products" && /^\/admin\/products\/[^/]+\/edit$/.test(pathname));
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV_SECTIONS = [
  { label: "Workspace", routes: ["/admin", "/admin/orders"] },
  { label: "Catalogue", routes: ["/admin/products", "/admin/categories", "/admin/inventory"] },
  { label: "Store management", routes: ["/admin/banners", "/admin/notifications", "/admin/settings"] },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
  storeName?: string;
  logo?: ImageAsset | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ onNavigate, storeName = "ABA Mart", logo, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin, logout } = useAdminSession();
  const addingProduct = pathname === "/admin/products/new";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-brand-deep pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-cream">
      <div className={cn("flex min-h-24 shrink-0 items-center gap-2 px-4", collapsed && "justify-center px-2")}>
        <Link href="/admin" onClick={onNavigate} aria-label={`${storeName} admin overview`} className={cn("flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-white", !onToggleCollapse && "pr-10")}>
          <Logo tone="dark" storeName={storeName} logo={logo} admin className="[&>span]:!h-11 [&>span]:!w-12 [&>img]:!h-11 [&>img]:!max-w-12" />
          {!collapsed && <>
            <span className="min-w-0"><span className="block truncate font-display text-sm font-semibold text-white">{storeName}</span><span className="mt-0.5 block text-[11px] text-cream/60">Store workspace</span></span>
          </>}
        </Link>
        {!collapsed && onToggleCollapse && <button type="button" onClick={onToggleCollapse} aria-label="Collapse sidebar" aria-expanded="true" title="Collapse sidebar" className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-cream/65 hover:bg-white/10 hover:text-white focus-visible:outline-white"><FiChevronLeft aria-hidden="true" className="size-4" /></button>}
      </div>
      <div className={cn("shrink-0 px-4 pb-5", collapsed && "px-3")}>
        <Link href="/admin/products/new" onClick={onNavigate} aria-label="Add product" title={collapsed ? "Add product" : undefined} aria-current={addingProduct ? "page" : undefined} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-brand-deep shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline-white", addingProduct && "ring-2 ring-white/70 ring-offset-2 ring-offset-brand-deep", collapsed && "px-0")}>
          <FiPlus aria-hidden="true" className="size-5 shrink-0" />{!collapsed && "Add product"}
        </Link>
      </div>
      <nav aria-label="Admin" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-5 [scrollbar-width:thin]">
        {NAV_SECTIONS.map((section) => <div key={section.label}>
          <p className={cn("mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/45", collapsed && "sr-only")}>{section.label}</p>
          <ul className={cn("space-y-1", collapsed && "space-y-2")}>
          {ADMIN_NAV.filter((item) => section.routes.includes(item.href)).map(({ label, href, icon: Icon, exact }) => {
            const active = isNavActive(pathname, href, exact);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-white",
                    active ? "bg-cream text-brand-deep shadow-sm" : "text-cream/70 hover:bg-white/8 hover:text-white",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-brand" : "text-cream/55 group-hover:text-cream")} aria-hidden="true" />
                  {!collapsed && <><span className="flex-1">{label}</span>{active && <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />}</>}
                </Link>
              </li>
            );
          })}
          </ul>
        </div>)}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        {collapsed && onToggleCollapse && <button type="button" onClick={onToggleCollapse} aria-label="Expand sidebar" aria-expanded="false" title="Expand sidebar" className="mb-2 flex min-h-11 w-full items-center justify-center rounded-xl text-cream/70 hover:bg-white/8 hover:text-white focus-visible:outline-white"><FiChevronRight aria-hidden="true" className="size-[18px]" /></button>}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={collapsed ? "View store (opens in a new tab)" : undefined}
          title={collapsed ? "View store" : undefined}
          className={cn("mb-3 flex min-h-11 items-center gap-3 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-cream/80 hover:border-white/30 hover:bg-white/8 hover:text-white focus-visible:outline-white", collapsed && "justify-center px-0")}
        >
          <FiArrowUpRight className="size-[18px] shrink-0" aria-hidden="true" />{!collapsed && <>View store<span className="sr-only"> (opens in a new tab)</span></>}
        </a>
        <div className={cn("flex min-w-0 items-center gap-2 rounded-xl bg-white/5 p-2", collapsed && "flex-col px-0")}>
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">{admin.name.charAt(0).toUpperCase()}</span>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white" title={admin.name}>{admin.name}</p><p className="mt-0.5 text-[10px] text-cream/55">Store administrator</p></div>}
        <button
          type="button"
          onClick={() => void logout()}
          aria-label="Sign out"
          title="Sign out"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-cream/60 hover:bg-white/10 hover:text-white focus-visible:outline-white"
        >
          <FiLogOut className="size-[18px]" aria-hidden="true" />
        </button>
        </div>
      </div>
    </div>
  );
}
