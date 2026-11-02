"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { FiArrowUpRight, FiLogOut, FiMenu, FiSearch } from "react-icons/fi";
import type { ImageAsset } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { InstallPwaButton } from "@/components/ui/InstallPwaButton";
import { AdminNotificationBell } from "./AdminNotificationBell";
import { useAdminSession } from "./AdminSession";

interface AdminHeaderProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
  storeName?: string;
  logo?: ImageAsset | null;
}

/** White top bar beside the sidebar: search, alerts and account. Phones also get the menu button and logo. */
export function AdminHeader({ onOpenMenu, menuOpen, storeName = "ABA Mart", logo = null }: AdminHeaderProps) {
  const router = useRouter();
  const { admin, logout } = useAdminSession();
  const searchId = useId();
  const [query, setQuery] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/admin/products?q=${encodeURIComponent(q)}` : "/admin/products");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white pt-[env(safe-area-inset-top)] shadow-[0_2px_12px_-8px_rgb(16_38_75/0.2)]">
      <div className="flex min-h-16 min-w-0 items-center gap-3 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:gap-5 lg:pl-8 lg:pr-8">
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
        <Link href="/admin" aria-label={`${storeName} admin overview`} className="flex shrink-0 items-center gap-2.5 rounded-lg lg:hidden">
          <Logo storeName={storeName} logo={logo} admin className="[&>span]:!h-10 [&>span]:!w-14 [&>img]:!h-10 [&>img]:!max-w-20" />
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-40 truncate font-display text-lg font-extrabold leading-tight tracking-tight text-brand-deep">{storeName}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Admin Portal</span>
          </span>
        </Link>

        <form role="search" onSubmit={search} className="hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-line bg-[#f4f6fb] p-1 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 md:flex">
          <label htmlFor={searchId} className="sr-only">Search products</label>
          <FiSearch className="ml-2 size-4 shrink-0 text-muted" aria-hidden="true" />
          <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Search products by name or SKU…" className="h-8 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/75" />
          <button type="submit" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-deep" aria-label="Search products"><FiSearch className="size-4" aria-hidden="true" /></button>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <InstallPwaButton variant="admin-header" />
          <AdminNotificationBell />
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-deep hover:bg-brand-50 xl:inline-flex">
            View store<FiArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
          <div className="flex items-center gap-2.5 rounded-xl border border-line py-1 pl-1 pr-1 sm:pr-1.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white" aria-hidden="true">
              {admin.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden min-w-0 max-w-40 sm:block">
              <span className="block truncate text-sm font-semibold leading-tight text-ink" title={admin.name}>{admin.name}</span>
              <span className="block truncate text-[11px] text-muted" title={admin.email}>{admin.email}</span>
            </span>
            <button type="button" onClick={() => void logout()} aria-label="Sign out" title="Sign out" className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger sm:inline-flex">
              <FiLogOut className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

    </header>
  );
}
