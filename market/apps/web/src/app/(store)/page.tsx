import type { Metadata } from "next";
import { Suspense } from "react";
import { Benefits } from "@/components/home/Benefits";
import { Categories, CategoriesSkeleton } from "@/components/home/Categories";
import { FeaturedProducts, NewArrivals, SectionSkeleton } from "@/components/home/FeaturedProducts";
import { Hero, HeroSkeleton } from "@/components/home/Hero";
import { Promotions } from "@/components/home/Promotions";
import { WhatsAppCta } from "@/components/home/WhatsAppCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
import { getBanners, getSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [settings, banners] = await Promise.all([getSettings(), getBanners()]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const storeName = settings.storeName || siteConfig.name;
  const description = settings.storeDescription || siteConfig.description;

  const socialLinks = Object.values(settings.socialLinks ?? {}).filter(Boolean);

  const localBusinessSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["OnlineStore", "LocalBusiness"],
    "@id": `${siteUrl}/#store`,
    name: storeName,
    description,
    url: siteUrl,
    ...(settings.logo ? { logo: settings.logo.url, image: settings.logo.url } : {}),
    telephone: settings.whatsappNumber || settings.supportPhone || undefined,
    currenciesAccepted: "GHS",
    priceRange: "₵₵",
    paymentAccepted: "Cash on Delivery, Mobile Money",
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address || "Accra, Ghana",
      addressLocality: "Accra",
      addressRegion: "Greater Accra",
      addressCountry: "GH",
    },
    ...(settings.openingHours ? { openingHours: settings.openingHours } : {}),
    ...(socialLinks.length ? { sameAs: socialLinks } : {}),
  };

  const webSiteSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: storeName,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={[localBusinessSchema, webSiteSchema]} />

      {/* When no hero banners are configured, provide a clear accessible primary heading */}
      {!banners.length && (
        <h1 className="sr-only">
          {storeName} — Everyday Essentials Online Shopping in Ghana
        </h1>
      )}

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
