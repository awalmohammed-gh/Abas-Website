"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiChevronDown, FiMenu, FiSearch, FiShoppingBag, FiX } from "react-icons/fi";
import type { ImageAsset } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { siteConfig } from "@/config/site";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import { whatsappChatUrl } from "@/lib/whatsapp";
import { MobileNavbar } from "./MobileNavbar";

export interface NavCategory {
  name: string;
  slug: string;
  count: number;
}

interface NavbarProps {
  storeName: string;
  logo: ImageAsset | null;
  whatsappNumber: string;
  /** Admin-set text for "Chat with us" links; empty uses the default question. */
  supportMessage?: string;
  supportPhone: string;
  categories: NavCategory[];
  /** Store-level switch from Admin → Settings → Notifications. */
  notificationsEnabled?: boolean;
}

/**
 * Desktop nav item: colour eases on hover; the current section gets a short
 * accent underline that grows in with a transform (no layout change).
 */
const navItemClass = (active: boolean) =>
  cn(
    "relative rounded-lg px-3 py-2 text-[15px] font-medium transition-colors duration-200 hover:text-brand",
    "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent after:transition-[scale] after:duration-300 after:ease-out-soft",
    active ? "text-brand after:scale-x-100" : "text-ink after:scale-x-0",
  );

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SearchForm({ onSubmitted, autoFocus, className }: { onSubmitted?: () => void; autoFocus?: boolean; className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={submit} className={cn("relative min-w-0", className)}>
      <label htmlFor={autoFocus ? "mobile-search" : "desktop-search"} className="sr-only">
        Search products
      </label>
      <input
        id={autoFocus ? "mobile-search" : "desktop-search"}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search soaps, shirts, body wash…"
        autoFocus={autoFocus}
        maxLength={100}
        className="h-11 w-full rounded-full border border-line bg-cream pl-11 pr-4 text-base text-ink placeholder:text-muted/80 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15 md:text-sm"
      />
      <FiSearch className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted" aria-hidden="true" />
    </form>
  );
}

function CategoriesMenu({ categories, active }: { categories: NavCategory[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="categories-menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(navItemClass(active), "inline-flex items-center gap-1", open && "text-brand")}
      >
        Categories
        <FiChevronDown className={cn("size-4 transition-transform duration-200 ease-out-soft", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div id="categories-menu" className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 animate-pop-in rounded-2xl border border-line bg-white p-2 shadow-pop">
          {categories.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">Categories will appear here once products are added.</p>
          ) : (
            <ul className="max-h-[60dvh] overflow-y-auto overscroll-contain">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-brand-50 hover:text-brand"
                  >
                    <span className="min-w-0 font-medium">{category.name}</span>
                    <span className="shrink-0 text-xs text-muted">{category.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/shop"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl bg-brand-50 px-3 py-2.5 text-center text-sm font-semibold text-brand hover:bg-brand-100"
          >
            Browse all products
          </Link>
        </div>
      )}
    </div>
  );
}

export function Navbar({ storeName, logo, whatsappNumber, supportMessage, supportPhone, categories, notificationsEnabled = false }: NavbarProps) {
  const pathname = usePathname();
  const { itemCount, hydrated } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const chatUrl = whatsappChatUrl(whatsappNumber, supportMessage || `Hello ${storeName}, I have a question about a product.`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-page flex min-h-[76px] items-center gap-3 py-3 lg:min-h-[88px] lg:gap-6 lg:py-4">
        <button
          type="button"
          className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-brand-50 lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <FiMenu className="size-6" />
        </button>

        <Link href="/" className="min-w-0 shrink" aria-label={`${storeName} home`}>
          <Logo storeName={storeName} logo={logo} />
        </Link>

        <nav aria-label="Main" className="ml-2 hidden shrink-0 items-center lg:flex">
          {siteConfig.mainNav.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={navItemClass(isActive(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}
          <CategoriesMenu categories={categories} active={pathname.startsWith("/categories")} />
          {siteConfig.mainNav.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={navItemClass(isActive(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <SearchForm className="ml-auto hidden w-full max-w-xs md:block xl:max-w-sm" />

        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-brand-50 md:hidden"
            aria-label={searchOpen ? "Close search" : "Search products"}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <FiX className="size-5" /> : <FiSearch className="size-5" />}
          </button>

          {chatUrl && (
            <a
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-whatsapp hover:bg-success-50 sm:inline-flex"
            >
              <FaWhatsapp className="size-5" aria-hidden="true" />
              <span className="hidden xl:inline">Chat with us</span>
              <span className="sr-only xl:hidden">Chat with us on WhatsApp</span>
            </a>
          )}

          {notificationsEnabled && <NotificationBell storeName={storeName} />}

          <Link
            href="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-brand-50"
            aria-label={hydrated ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"}
          >
            <FiShoppingBag className="size-[22px]" />
            {hydrated && itemCount > 0 && (
              <span
                key={itemCount}
                className="absolute -right-0.5 -top-0.5 flex min-w-5 animate-pop-in items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-brand-deep ring-2 ring-white"
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line bg-white px-4 py-3 md:hidden">
          <SearchForm autoFocus onSubmitted={() => setSearchOpen(false)} />
        </div>
      )}

      <MobileNavbar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        storeName={storeName}
        logo={logo}
        pathname={pathname}
        categories={categories}
        chatUrl={chatUrl}
        supportPhone={supportPhone}
      />
    </header>
  );
}
