"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight, FiGrid, FiPackage, FiSearch, FiShoppingBag } from "react-icons/fi";
import type { ImageAsset } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InstallPwaButton } from "@/components/ui/InstallPwaButton";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import { whatsappChatUrl } from "@/lib/whatsapp";

export interface NavCategory { name: string; slug: string; count: number }
interface NavbarProps {
  storeName: string;
  logo: ImageAsset | null;
  whatsappNumber: string;
  supportMessage?: string;
  supportPhone: string;
  categories: NavCategory[];
  notificationsEnabled?: boolean;
}

/** A native GET form keeps product search usable before JavaScript loads. */
export function SearchForm({ className }: { className?: string }) {
  const id = useId();
  return (
    <form role="search" action="/shop" method="get" className={cn("flex min-w-0 items-center gap-2 rounded-xl border border-line bg-cream p-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10", className)}>
      <label htmlFor={id} className="sr-only">Search products</label>
      <FiSearch className="ml-2 size-5 shrink-0 text-muted" aria-hidden="true" />
      <input id={id} name="q" type="search" maxLength={100} placeholder="What are you looking for?" className="h-9 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted/75 md:text-sm" />
      <button type="submit" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep sm:px-4">Search<FiArrowRight className="hidden size-4 sm:block" aria-hidden="true" /></button>
    </form>
  );
}

export function Navbar({ storeName, logo, whatsappNumber, supportMessage, categories, notificationsEnabled = false }: NavbarProps) {
  const pathname = usePathname();
  const { itemCount, hydrated } = useCart();
  const chatUrl = whatsappChatUrl(whatsappNumber, supportMessage || `Hello ${storeName}, I have a question about a product.`);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white shadow-[0_2px_12px_-8px_rgb(16_56_45/0.2)]">
      <div className="container-page flex flex-wrap items-center gap-x-4 gap-y-2.5 py-2.5 md:flex-nowrap md:gap-6 md:py-3">
        <Link href="/" aria-label={`${storeName} home`} className="flex shrink-0 items-center gap-2.5 rounded-lg">
          <Logo storeName={storeName} logo={logo} className="[&>span]:!h-11 [&>span]:!w-16 [&>img]:!h-11 [&>img]:!max-w-24" />
          <span className="hidden min-w-0 sm:block"><span className="block max-w-36 truncate font-display text-lg font-bold tracking-tight text-brand-deep">{storeName}</span><span className="block text-[10px] font-medium tracking-wide text-muted">Everyday finds. One place.</span></span>
        </Link>
        <SearchForm className="order-3 w-full md:order-none md:w-auto md:flex-1" />
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0">
          <InstallPwaButton variant="navbar" />
          {notificationsEnabled && <NotificationBell storeName={storeName} />}
          <Link href="/my-orders" aria-label="My orders" className="hidden min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-ink hover:bg-brand-50 lg:inline-flex"><FiPackage className="size-5" aria-hidden="true" /><span>My orders</span></Link>
          <Link href="/cart" aria-label={hydrated ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"} className="relative inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-brand-deep hover:bg-brand-50">
            <FiShoppingBag className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Cart</span>
            {hydrated && itemCount > 0 && <span className="flex min-w-5 items-center justify-center rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-brand-deep">{itemCount > 99 ? "99+" : itemCount}</span>}
          </Link>
        </div>
      </div>
      <div className="border-t border-line/70">
        <div className="container-page flex items-center gap-4">
          <nav aria-label="Shop navigation" className="relative min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex w-max items-center gap-1 py-1.5 text-xs sm:text-sm">
              <li><Link href="/shop" aria-current={pathname === "/shop" ? "page" : undefined} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-50 px-3 font-semibold text-brand"><FiGrid className="size-4" aria-hidden="true" />All products</Link></li>
              <li><Link href="/shop?sort=newest" className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 font-medium text-ink hover:bg-cream">New arrivals</Link></li>
              {categories.filter((category) => category.count > 0).map((category) => <li key={category.slug}><Link href={`/categories/${category.slug}`} aria-current={pathname === `/categories/${category.slug}` ? "page" : undefined} className={cn("inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 font-medium hover:bg-cream", pathname === `/categories/${category.slug}` ? "bg-brand-50 text-brand" : "text-muted")}>{category.name}</Link></li>)}
            </ul>
          </nav>
          {chatUrl && <a href={chatUrl} target="_blank" rel="noopener noreferrer" className="hidden min-h-10 shrink-0 items-center gap-2 whitespace-nowrap text-xs font-semibold text-whatsapp lg:inline-flex"><FaWhatsapp className="size-4" aria-hidden="true" />Need a hand?<span className="sr-only"> Chat on WhatsApp, opens in a new tab</span></a>}
        </div>
      </div>
    </header>
  );
}
