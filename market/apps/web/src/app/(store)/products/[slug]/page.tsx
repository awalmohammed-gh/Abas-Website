import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { priceRange, type ProductDTO } from "@aba-mart/shared";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ProductDetails } from "@/components/products/ProductDetails";
import { ProductGrid } from "@/components/products/ProductGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { EmptyState } from "@/components/ui/EmptyState";
import { siteConfig } from "@/config/site";
import { getMetadataSettings, getProduct, getSettings } from "@/lib/catalog";
import { whatsappOrderingNotice } from "@/lib/whatsapp";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [result, { storeName }] = await Promise.all([getProduct(slug), getMetadataSettings()]);
  if (result.status !== "found") return { title: "Product not found", robots: { index: false } };

  const { product } = result;
  const range = priceRange(product);
  const minPriceGhs = (range.min / 100).toFixed(2);
  const maxPriceGhs = (range.max / 100).toFixed(2);
  const priceDisplay = range.min === range.max ? `GH₵ ${minPriceGhs}` : `GH₵ ${minPriceGhs} – ${maxPriceGhs}`;

  const categoryPath = [product.category?.name, product.subCategory].filter(Boolean).join(" · ");
  const description = (
    product.description ||
    `Buy ${product.name} ${categoryPath ? `(${categoryPath})` : ""} online in Ghana for ${priceDisplay} at ${storeName}. Order on WhatsApp with fast delivery.`
  ).slice(0, 160);

  const ogImages = product.images.slice(0, 4).map((image) => ({
    url: image.url,
    alt: image.alt || `${product.name} at ${storeName}`,
  }));

  return {
    title: `${product.name} — ${priceDisplay}`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      locale: "en_GH",
      siteName: storeName,
      title: `${product.name} — ${priceDisplay} | ${storeName}`,
      description,
      url: `/products/${product.slug}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — ${priceDisplay}`,
      description,
      images: ogImages.slice(0, 1).map((i) => i.url),
    },
  };
}

function buildProductSchemas(product: ProductDTO, storeName: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const range = priceRange(product);
  const toCedis = (pesewas: number) => (pesewas / 100).toFixed(2);
  const availability = product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const productUrl = absoluteUrl(`/products/${product.slug}`);

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description || undefined,
    image: product.images.map((i) => i.url),
    sku: product.id,
    category: [product.category?.name, product.subCategory].filter(Boolean).join(" > ") || undefined,
    brand: { "@type": "Brand", name: storeName },
    offers:
      range.min === range.max
        ? {
            "@type": "Offer",
            url: productUrl,
            priceCurrency: "GHS",
            price: toCedis(range.min),
            availability,
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: storeName },
          }
        : {
            "@type": "AggregateOffer",
            url: productUrl,
            priceCurrency: "GHS",
            lowPrice: toCedis(range.min),
            highPrice: toCedis(range.max),
            offerCount: product.variants.length,
            availability,
            seller: { "@type": "Organization", name: storeName },
          },
  };

  const breadcrumbs = [
    { name: "Home", url: siteUrl },
    { name: "Shop", url: `${siteUrl}/shop` },
  ];

  if (product.category) {
    breadcrumbs.push({
      name: product.category.name,
      url: `${siteUrl}/categories/${product.category.slug}`,
    });
  }

  breadcrumbs.push({
    name: product.name,
    url: productUrl,
  });

  const breadcrumbSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: b.name,
      item: b.url,
    })),
  };

  return [productSchema, breadcrumbSchema];
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const [result, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return <EmptyState icon={<FiAlertCircle />} title="We couldn't load this product" description="Please refresh the page in a moment." />;
  }
  const { product, related } = result;
  const schemas = buildProductSchemas(product, settings.storeName);

  return (
    <>
      <JsonLd data={schemas} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
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
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/categories/${product.category.slug}`} className="hover:text-brand">
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="line-clamp-1 font-medium text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductDetails product={product} whatsappEnabled={!whatsappOrderingNotice(settings)} whatsappNotice={whatsappOrderingNotice(settings)} />

      {related.length > 0 && (
        <section className="mt-16 sm:mt-20" aria-labelledby="related-heading">
          <SectionHeading
            id="related-heading"
            title="You may also like"
            href={product.category ? `/categories/${product.category.slug}` : "/shop"}
            linkLabel={product.category ? `More ${product.category.name}` : "View all"}
          />
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12" aria-hidden="true">
      <div className="skeleton aspect-square" />
      <div className="space-y-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-4/5" />
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-40 w-full" />
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <div className="container-page py-6 sm:py-10">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}
