import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductGridSkeleton } from "@/components/products/ProductGrid";
import { ProductListing } from "@/components/products/ProductListing";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Browse soaps, shower gels, skincare, clothing, household essentials and more. Order on WhatsApp in minutes.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="container-page py-8 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Shop</p>
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">All products</h1>
        <p className="mt-2 max-w-2xl text-muted">Everything in stock at ABA Mart, across every category. Prices in Ghana Cedis.</p>
      </header>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="skeleton h-28" />
            <ProductGridSkeleton />
          </div>
        }
      >
        <ProductListing searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
