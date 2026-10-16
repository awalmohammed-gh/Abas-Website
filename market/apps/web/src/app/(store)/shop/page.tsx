import type { Metadata } from "next";
import { Suspense } from "react";
import { FiCreditCard, FiMessageCircle, FiTag } from "react-icons/fi";
import { ProductGridSkeleton } from "@/components/products/ProductGrid";
import { ProductListing } from "@/components/products/ProductListing";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Browse soaps, shower gels, skincare, clothing, household essentials and more. Order on WhatsApp in minutes.",
  alternates: { canonical: "/shop" },
};

const PERKS = [
  { icon: FiMessageCircle, label: "Order on WhatsApp" },
  { icon: FiCreditCard, label: "No account or online payment" },
  { icon: FiTag, label: "Prices in Ghana Cedis" },
];

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="container-page py-5 sm:py-8">
      <header className="relative isolate mb-5 overflow-hidden rounded-3xl bg-brand-deep px-5 py-6 text-cream sm:mb-8 sm:px-8 sm:py-10 lg:px-12">
        <div aria-hidden="true" className="absolute -right-20 -top-28 -z-10 size-72 rounded-full bg-accent/15 blur-3xl sm:size-96" />
        <div aria-hidden="true" className="absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-brand-700/70 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Shop</p>
        <h1 className="mt-2 font-display text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">Everything in one place</h1>
        <p className="mt-2 max-w-xl text-sm text-cream/75 sm:mt-3 sm:text-base">Clothing, home essentials and everyday care. Find what you need, then send your order to us on WhatsApp.</p>
        <ul className="mt-4 flex flex-wrap gap-1.5 sm:mt-6 sm:gap-2">
          {PERKS.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-cream ring-1 ring-white/15 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm">
              <Icon className="size-3.5 shrink-0 text-accent sm:size-4" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </header>
      <Suspense
        fallback={
          <div className="space-y-5 sm:space-y-6">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton h-11 w-32 shrink-0 rounded-full" />
              ))}
            </div>
            <div className="skeleton h-16 rounded-2xl" />
            <ProductGridSkeleton />
          </div>
        }
      >
        <ProductListing searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
