import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { priceRange, type ProductDTO } from "@aba-mart/shared";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ProductDetails } from "@/components/products/ProductDetails";
import { ProductGrid } from "@/components/products/ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMetadataSettings, getProduct, getSettings } from "@/lib/catalog";
import { whatsappOrderingNotice } from "@/lib/whatsapp";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [result, { storeName }] = await Promise.all([getProduct(slug), getMetadataSettings()]);
  if (result.status !== "found") return { title: "Product not found", robots: { index: false } };
  const { product } = result;
  const description = (product.description || `${product.name} available at ${storeName}. Order on WhatsApp.`).slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      images: product.images.slice(0, 1).map((image) => ({ url: image.url, alt: image.alt || product.name })),
    },
  };
}

function productJsonLd(product: ProductDTO, storeName: string) {
  const range = priceRange(product);
  const toCedis = (pesewas: number) => (pesewas / 100).toFixed(2);
  const availability = product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
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
            url: absoluteUrl(`/products/${product.slug}`),
            priceCurrency: "GHS",
            price: toCedis(range.min),
            availability,
            seller: { "@type": "Organization", name: storeName },
          }
        : {
            "@type": "AggregateOffer",
            url: absoluteUrl(`/products/${product.slug}`),
            priceCurrency: "GHS",
            lowPrice: toCedis(range.min),
            highPrice: toCedis(range.max),
            offerCount: product.variants.length,
            availability,
          },
  };
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const [result, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return <EmptyState icon={<FiAlertCircle />} title="We couldn't load this product" description="Please refresh the page in a moment." />;
  }
  const { product, related } = result;

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD must be raw; "<" is escaped so product text can't break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, settings.storeName)).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {product.category ? (
            <li>
              <Link href={`/categories/${product.category.slug}`} className="hover:text-brand">
                {product.category.name}
              </Link>
            </li>
          ) : (
            <li>
              <Link href="/shop" className="hover:text-brand">
                Shop
              </Link>
            </li>
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
