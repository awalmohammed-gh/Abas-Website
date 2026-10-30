"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiHome,
  HiOutlineHome,
  HiSquares2X2,
  HiOutlineSquares2X2,
  HiShoppingCart,
  HiOutlineShoppingCart,
  HiClipboardDocumentList,
  HiOutlineClipboardDocumentList,
  HiPhone,
  HiOutlinePhone,
} from "react-icons/hi2";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home", href: "/", icon: HiOutlineHome, activeIcon: HiHome },
  { label: "Shop", href: "/shop", icon: HiOutlineSquares2X2, activeIcon: HiSquares2X2 },
  { label: "Cart", href: "/cart", icon: HiOutlineShoppingCart, activeIcon: HiShoppingCart },
  { label: "My Orders", href: "/my-orders", icon: HiOutlineClipboardDocumentList, activeIcon: HiClipboardDocumentList },
  { label: "Contact", href: "/contact", icon: HiOutlinePhone, activeIcon: HiPhone },
] as const;

export function MobileFloatingNav() {
  const pathname = usePathname();
  const { itemCount, hydrated } = useCart();
  const count = hydrated ? itemCount : 0;

  return (
    <nav
      aria-label="Storefront bottom navigation"
      className="fixed left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-brand/10 bg-white/90 p-1.5 shadow-lg backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5 gap-1">
        {TABS.map((tab) => {
          const active = tab.href === "/"
            ? pathname === "/"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              || (tab.href === "/shop" && (pathname.startsWith("/products") || pathname.startsWith("/categories/")));
          const Icon = active ? tab.activeIcon : tab.icon;
          const isCart = tab.href === "/cart";

          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={isCart ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] leading-tight whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none",
                  active ? "bg-brand-50 font-semibold text-brand" : "font-medium text-muted hover:bg-brand-50/70 hover:text-brand",
                )}
              >
                <span className="relative inline-flex">
                  <Icon aria-hidden="true" className={cn("size-5 transition-transform duration-200 motion-reduce:transition-none", active && "scale-110")} />
                  {isCart && count > 0 && (
                    <span aria-hidden="true" className="absolute -right-2.5 -top-2 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] leading-4 font-bold tabular-nums text-white ring-2 ring-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <span role="status" aria-atomic="true" className="sr-only">
        {hydrated ? `${count} ${count === 1 ? "item" : "items"} in your cart` : ""}
      </span>
    </nav>
  );
}
