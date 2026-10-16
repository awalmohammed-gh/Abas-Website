import { FiPackage } from "react-icons/fi";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { ProductGrid, ProductGridSkeleton } from "@/components/products/ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProducts, getSettings, type ProductQuery } from "@/lib/catalog";
import { SectionHeading } from "./SectionHeading";

interface ProductSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  query: ProductQuery;
  /** Hide the section entirely when nothing matches (e.g. no featured items yet). */
  hideWhenEmpty?: boolean;
  tone?: "plain" | "tinted";
}

async function ProductSection({ id, eyebrow, title, description, href, query, hideWhenEmpty = false, tone = "plain" }: ProductSectionProps) {
  const result = await getProducts(query);
  if (result && result.items.length === 0 && hideWhenEmpty) return null;

  return (
    <section className={tone === "tinted" ? "bg-white py-14 sm:py-16" : "py-14 sm:py-16"} aria-labelledby={id}>
      <div className="container-page">
        <SectionHeading id={id} eyebrow={eyebrow} title={title} description={description} href={result?.items.length ? href : undefined} />
        {result === null ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Products couldn&apos;t be loaded right now. Please refresh in a moment.</p>
        ) : (
          <StaggerContainer items=":scope > ul > li">
            <ProductGrid
              products={result.items}
            empty={
              <EmptyState
                icon={<FiPackage />}
                title="New stock is on the way"
                description="We're adding products to the store. In the meantime, message us on WhatsApp and we'll help you find what you need."
              />
              }
            />
          </StaggerContainer>
        )}
      </div>
    </section>
  );
}

/** Hidden when switched off in Admin → Settings → Storefront. */
export async function FeaturedProducts() {
  const { storefront } = await getSettings();
  if (!storefront.showFeaturedProducts) return null;
  return (
    <ProductSection
      id="featured-heading"
      eyebrow="Handpicked"
      title="Featured products"
      description="Customer favourites and essentials we always keep in stock."
      href="/shop"
      query={{ featured: true, limit: 8 }}
      hideWhenEmpty
      tone="tinted"
    />
  );
}

/** Hidden when switched off in Admin → Settings → Storefront. */
export async function NewArrivals() {
  const { storefront } = await getSettings();
  if (!storefront.showNewArrivals) return null;
  return <ProductSection id="new-heading" eyebrow="Just in" title="New arrivals" href="/shop" query={{ sort: "newest", limit: 8 }} />;
}

export function SectionSkeleton() {
  return (
    <div className="container-page py-14 sm:py-16" aria-hidden="true">
      <div className="skeleton mb-8 h-8 w-56" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
