import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Promotions } from "@/components/home/Promotions";
import { ShopListing, ShopListingSkeleton } from "@/components/products/ShopListing";
import { getMetadataSettings } from "@/lib/catalog";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const { q } = await searchParams;
  const { storeName } = await getMetadataSettings();

  const title = q ? `Search results for "${q}"` : "All Products — Shop Online in Ghana";
  const description = q
    ? `Explore search results for "${q}" at ${storeName}. Order on WhatsApp for fast delivery across Ghana.`
    : `Browse soaps, shower gels, skincare, clothing, household essentials and more at ${storeName}. Order easily on WhatsApp with fast delivery in Ghana.`;

  return {
    title,
    description,
    alternates: { canonical: "/shop" },
    openGraph: {
      type: "website",
      locale: "en_GH",
      siteName: storeName,
      title: `${title} | ${storeName}`,
      description,
      url: "/shop",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${storeName}`,
      description,
    },
  };
}

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="mart-shop container-page pt-2 pb-6 sm:pb-10">
      <header className="shop-hero">
        <div className="shop-hero-copy">
          <h1>Shop Our Products</h1>
          <p>Discover amazing products at great prices.</p>
        </div>
        <span className="shop-hero-dots" aria-hidden="true" />
        <div className="shop-hero-image">
          <Image src="/images/home/checkout-cart-v1.webp" alt="" fill preload sizes="(min-width: 1024px) 640px, 60vw" className="object-cover" />
        </div>
      </header>
      <Suspense fallback={<ShopListingSkeleton />}>
        <ShopListing searchParams={searchParams} />
      </Suspense>
      <div className="mt-8 sm:mt-10">
        <Suspense fallback={null}>
          <Promotions contained={false} />
        </Suspense>
      </div>
    </div>
  );
}
