"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, type Ref } from "react";
import { flushSync } from "react-dom";
import { FaWhatsapp } from "react-icons/fa";
import { FiHeart, FiPackage, FiSearch, FiShoppingBag, FiX } from "react-icons/fi";
import type { ImageAsset } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InstallPwaButton } from "@/components/ui/InstallPwaButton";
import { useCart } from "@/hooks/useCart";
import { useWishlistIds } from "@/hooks/useWishlist";
import { cn } from "@/lib/utils";
import { whatsappChatUrl } from "@/lib/whatsapp";

export interface NavCategory { name: string; slug: string; count: number }
interface NavbarProps {
  storeName: string;
  logo: ImageAsset | null;
  whatsappNumber: string;
  supportMessage?: string;
  supportPhone: string;
  notificationsEnabled?: boolean;
}

/** A native GET form keeps product search usable before JavaScript loads. */
export function SearchForm({ id: formId, className, inputRef, onEscape }: { id?: string; className?: string; inputRef?: Ref<HTMLInputElement>; onEscape?: () => void }) {
  const id = useId();
  return (
    <form id={formId} role="search" action="/shop" method="get" onKeyDown={onEscape && (event => { if (event.key === "Escape") onEscape(); })} className={cn("flex min-w-0 items-center gap-2 rounded-xl border border-line bg-[#f4f6fb] p-1 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10", className)}>
      <label htmlFor={id} className="sr-only">Search products</label>
      <FiSearch className="ml-2 size-4 shrink-0 text-muted" aria-hidden="true" />
      <input ref={inputRef} id={id} name="q" type="search" maxLength={100} placeholder="Search for products..." className="h-8 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted/75 md:text-sm" />
      <button type="submit" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-deep" aria-label="Search products"><FiSearch className="size-4" aria-hidden="true" /></button>
    </form>
  );
}

export function Navbar({ storeName, logo, whatsappNumber, supportMessage, notificationsEnabled = false }: NavbarProps) {
  const pathname = usePathname();
  const { itemCount, hydrated } = useCart();
  const wishlistCount = useWishlistIds().length;
  const chatUrl = whatsappChatUrl(whatsappNumber, supportMessage || `Hello ${storeName}, I have a question about a product.`);
  // Remembering the page it was opened on closes the phone search automatically after navigating.
  const [searchPath, setSearchPath] = useState<string | null>(null);
  const searchOpen = searchPath === pathname;
  const searchId = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const toggleSearch = () => {
    // Render synchronously so focusing stays inside the tap and phones raise the keyboard.
    flushSync(() => setSearchPath(searchOpen ? null : pathname));
    if (!searchOpen) searchInput.current?.focus();
  };
  return (
    <header className="mart-header sticky top-0 z-40 border-b border-line bg-white shadow-[0_2px_12px_-8px_rgb(16_56_45/0.2)]">
      {/* One row. Below lg the bottom dock carries the page links; below xl search folds into an icon that drops it in under the row. */}
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-2.5 py-2.5 xl:flex-nowrap xl:gap-x-4">
        <Link href="/" aria-label={`${storeName} home`} className="flex shrink-0 items-center gap-2.5 rounded-lg">
          <Logo storeName={storeName} logo={logo} className="[&>span]:!h-11 [&>span]:!w-16 [&>img]:!h-11 [&>img]:!max-w-24" />
          <span className="hidden min-w-0 sm:block lg:hidden"><span className="block max-w-36 truncate font-display text-2xl font-extrabold tracking-tight text-brand-deep">{storeName === "ABA Mart" ? <><span className="text-brand">ABA </span><span className="text-[#ed2b15]">Mart</span></> : storeName}</span><span className="block text-[10px] font-medium tracking-wide text-muted">Shop Smart. Live Better.</span></span>
        </Link>
        <nav aria-label="Shop navigation" className="hidden shrink-0 lg:block">
          <ul className="flex items-center gap-1 text-sm">
            {[{label:"Home",href:"/"},{label:"Shop",href:"/shop"},{label:"About Us",href:"/about"},{label:"Contact Us",href:"/contact"}].map(item => <li key={item.href}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="inline-flex min-h-11 items-center px-2.5 font-semibold whitespace-nowrap text-ink transition-colors hover:text-brand aria-[current=page]:text-brand aria-[current=page]:shadow-[inset_0_-2px_var(--color-brand)]">{item.label}</Link></li>)}
          </ul>
        </nav>
        <SearchForm id={searchId} inputRef={searchInput} onEscape={() => setSearchPath(null)} className={cn("order-3 w-full xl:order-none xl:w-auto xl:max-w-xs xl:flex-1", searchOpen ? "max-xl:animate-pop-in" : "max-xl:hidden")} />
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <button type="button" onClick={toggleSearch} aria-expanded={searchOpen} aria-controls={searchId} aria-label={searchOpen ? "Close search" : "Search products"} className="inline-flex size-11 items-center justify-center rounded-xl text-brand-deep hover:bg-brand-50 xl:hidden">
            {searchOpen ? <FiX className="size-5" aria-hidden="true" /> : <FiSearch className="size-5" aria-hidden="true" />}
          </button>
          {chatUrl && <a href={chatUrl} target="_blank" rel="noopener noreferrer" title="Help & Support" className="hidden size-11 items-center justify-center rounded-xl text-whatsapp hover:bg-brand-50 xl:inline-flex"><FaWhatsapp className="size-5" aria-hidden="true" /><span className="sr-only">Help and support on WhatsApp, opens in a new tab</span></a>}
          <InstallPwaButton variant="navbar" />
          {notificationsEnabled && <NotificationBell storeName={storeName} />}
          <Link href="/my-orders" aria-label="My orders" title="My orders" className="hidden size-11 items-center justify-center rounded-xl text-ink hover:bg-brand-50 lg:inline-flex"><FiPackage className="size-5" aria-hidden="true" /></Link>
          <Link href="/wishlist" aria-label={wishlistCount ? `Wishlist, ${wishlistCount} saved item${wishlistCount === 1 ? "" : "s"}` : "Wishlist"} title="Wishlist" aria-current={pathname === "/wishlist" ? "page" : undefined} className="relative inline-flex size-11 items-center justify-center rounded-xl text-ink hover:bg-brand-50 aria-[current=page]:text-brand">
            <FiHeart className={cn("size-5", wishlistCount > 0 && "fill-brand text-brand")} aria-hidden="true" />
            {wishlistCount > 0 && <span className="absolute right-0.5 top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-[#f53625] px-1 text-[10px] font-bold leading-4.5 text-white">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
          </Link>
          <Link href="/cart" aria-label={hydrated ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"} className="relative inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-brand-deep hover:bg-brand-50">
            <FiShoppingBag className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Cart</span>
            {hydrated && itemCount > 0 && <span className="flex min-w-5 items-center justify-center rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-brand-deep">{itemCount > 99 ? "99+" : itemCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
