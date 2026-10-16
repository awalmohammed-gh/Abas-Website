import type { Metadata } from "next";
import { Suspense } from "react";
import { Benefits } from "@/components/home/Benefits";
import { Categories, CategoriesSkeleton } from "@/components/home/Categories";
import { FeaturedProducts, NewArrivals, SectionSkeleton } from "@/components/home/FeaturedProducts";
import { Hero, HeroSkeleton } from "@/components/home/Hero";
import { Promotions } from "@/components/home/Promotions";
import { WhatsAppCta } from "@/components/home/WhatsAppCta";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <NewArrivals />
      </Suspense>
      <Suspense fallback={null}>
        <Promotions />
      </Suspense>
      <Benefits />
      <Suspense fallback={null}>
        <WhatsAppCta />
      </Suspense>
    </>
  );
}
