import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { ProductGridSkeleton } from "@/components/products/ProductGrid";
import { ProductListing } from "@/components/products/ProductListing";
import { JsonLd } from "@/components/seo/JsonLd";
import { EmptyState } from "@/components/ui/EmptyState";
import { siteConfig } from "@/config/site";
import { getCategory, getMetadataSettings } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [category, { storeName }] = await Promise.all([getCategory(slug), getMetadataSettings()]);
  if (!category || category === "error") return { title: "Category", robots: { index: false } };

  const description =
    category.description ||
    `Browse ${category.name} online in Ghana at ${storeName}. Order on WhatsApp with fast and reliable delivery.`;

  const ogImages = category.image
    ? [{ url: category.image.url, alt: `${category.name} at ${storeName}` }]
    : [];

  return {
    title: `${category.name} — Shop Online in Ghana`,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      type: "website",
      locale: "en_GH",
      siteName: storeName,
      title: `${category.name} — Shop Online in Ghana | ${storeName}`,
      description,
      url: `/categories/${category.slug}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} — Shop Online in Ghana`,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

async function CategoryContent({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const [category, { storeName }] = await Promise.all([getCategory(slug), getMetadataSettings()]);
  if (category === null) notFound();
  if (category === "error") {
    return (
      <EmptyState icon={<FiAlertCircle />} title="We couldn't load this category" description="Please refresh the page in a moment." />
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const categoryUrl = `${siteUrl}/categories/${category.slug}`;

  const breadcrumbSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
      { "@type": "ListItem", position: 3, name: category.name, item: categoryUrl },
    ],
  };

  const collectionSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${categoryUrl}#collection`,
    name: `${category.name} — Shop Online in Ghana`,
    description: category.description || `Browse ${category.name} at ${storeName}`,
    url: categoryUrl,
    ...(category.image ? { image: category.image.url } : {}),
  };

  return (
    <>
      <JsonLd data={[collectionSchema, breadcrumbSchema]} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/shop" className="hover:text-brand">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-ink">
            {category.name}
          </li>
        </ol>
      </nav>
      <header className="mb-8 flex flex-col gap-5 overflow-hidden rounded-3xl border border-line bg-white sm:flex-row sm:items-center">
        {category.image && (
          <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-square sm:w-48">
            <Image src={category.image.url} alt={category.name} fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover" priority />
          </div>
        )}
        <div className="p-5 sm:p-6">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{category.name}</h1>
          {category.description && <p className="mt-2 max-w-2xl text-muted">{category.description}</p>}
        </div>
      </header>
      <ProductListing searchParams={searchParams} category={category} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/categories/[slug]">) {
  return (
    <div className="container-page py-8 sm:py-12">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="skeleton h-32" />
            <ProductGridSkeleton />
          </div>
        }
      >
        <CategoryContent {...props} />
      </Suspense>
    </div>
  );
}
