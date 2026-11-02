import { FiPackage } from "react-icons/fi";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { ProductGrid, ProductGridSkeleton } from "@/components/products/ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProducts, getSettings, type ProductQuery } from "@/lib/catalog";
import { SectionHeading } from "./SectionHeading";

interface ProductSectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  href: string;
  query: ProductQuery;
  /** Hide the section entirely when nothing matches (e.g. no featured items yet). */
  hideWhenEmpty?: boolean;
  tone?: "plain" | "tinted";
}

async function ProductSection({ id, eyebrow, title, description, href, query, hideWhenEmpty = false, tone = "plain" }: ProductSectionProps) {
  const featured = await getProducts(query);
  const result = query.featured && featured?.items.length === 0 ? await getProducts({ limit: 5 }) : featured;
  if (result && result.items.length === 0 && hideWhenEmpty) return null;

  return (
    <section className={tone === "tinted" ? "bg-white/60 py-7 sm:py-10" : "py-7 sm:py-10"} aria-labelledby={id}>
      <div className="container-page">
        <SectionHeading id={id} eyebrow={eyebrow} title={title} description={description} href={result?.items.length ? href : undefined} />
        {result === null ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Products couldn&apos;t be loaded right now. Please refresh in a moment.</p>
        ) : (
          <StaggerContainer items=":scope > ul > li">
            <ProductGrid
              products={result.items}
              className="gap-y-4 sm:gap-y-5 xl:grid-cols-5"
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
      title="Discover Our Featured Products"
      href="/shop"
      query={{ featured: true, limit: 5 }}
    />
  );
}

/** Hidden when switched off in Admin → Settings → Storefront. */
export async function NewArrivals() {
  const { storefront } = await getSettings();
  if (!storefront.showNewArrivals) return null;
  const [newest, offers] = await Promise.all([getProducts({ sort: "newest", limit: 3 }), getProducts({ onSale: true, limit: 3 })]);
  return (
    <section className="container-page py-8 sm:py-10">
      <div className="mart-discover-grid">
        <div className="min-w-0"><SectionHeading id="new-heading" title="Fresh Finds Just for You" href="/shop?sort=newest" />
          {newest ? <ProductGrid products={newest.items} className="!grid-cols-2 sm:!grid-cols-3 !gap-3" empty={<p className="text-sm text-muted">New stock is on the way.</p>} /> : <p className="text-sm text-muted">New arrivals could not be loaded. Please try again shortly.</p>}
        </div>
        <div className="mart-offers min-w-0"><SectionHeading title="Special Offers" description="Grab these amazing deals!" href="/shop?onSale=true" />
          {offers?.items.length ? <ProductGrid products={offers.items} className="!grid-cols-2 sm:!grid-cols-3 !gap-3" /> : <div className="rounded-xl bg-accent-50 p-7"><p className="text-xl font-bold text-brand-deep">Your next great find is waiting.</p><p className="mt-3 text-sm leading-6 text-muted">Explore the collection for everyday value. New offers appear here as they arrive.</p><a href="/shop" className="mt-5 inline-flex min-h-11 items-center font-semibold text-brand">Explore the store &rarr;</a></div>}
          {offers === null && <p className="mt-3 text-xs text-muted">Offers could not be loaded right now.</p>}
        </div>
      </div>
    </section>
  );
}

export function SectionSkeleton() {
  return (
    <div className="container-page py-7 sm:py-10" aria-hidden="true">
      <div className="skeleton mb-8 h-8 w-56" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
