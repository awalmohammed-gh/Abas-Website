import Image from "next/image";
import Link from "next/link";
import { FiGrid } from "react-icons/fi";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategories } from "@/lib/catalog";
import { SectionHeading } from "./SectionHeading";

const TILE_TONES = ["bg-brand-50", "bg-accent-50", "bg-cream-200", "bg-[#eef2f6]"];

export async function Categories() {
  const categories = await getCategories();

  return (
    <section className="container-page py-14 sm:py-16" aria-labelledby="categories-heading">
      <SectionHeading id="categories-heading" eyebrow="Shop by category" title="Find what you need" href="/shop" linkLabel="All products" />
      {categories === null ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Categories couldn&apos;t be loaded right now. Please refresh in a moment.</p>
      ) : categories.length === 0 ? (
        <EmptyState icon={<FiGrid />} title="Categories are on the way" description="We're organising our shelves. Check back shortly to browse by category." />
      ) : (
        <StaggerContainer as="ul" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {categories.slice(0, 8).map((category, index) => (
            <li key={category.id} className="lift">
              <Link
                href={`/categories/${category.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white"
              >
                <div className={`relative aspect-[4/3] overflow-hidden ${TILE_TONES[index % TILE_TONES.length]}`}>
                  {category.image ? (
                    <Image
                      src={category.image.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 300px, (min-width: 640px) 31vw, 48vw"
                      className="object-cover transition-[scale] duration-500 ease-out-soft group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold text-brand/25" aria-hidden="true">
                      {category.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
                  <span className="truncate font-display text-[15px] font-semibold text-ink transition-colors duration-200 group-hover:text-brand">{category.name}</span>
                  <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 text-xs text-muted">{category.productCount ?? 0}</span>
                </div>
              </Link>
            </li>
          ))}
        </StaggerContainer>
      )}
    </section>
  );
}

export function CategoriesSkeleton() {
  return (
    <div className="container-page py-14 sm:py-16" aria-hidden="true">
      <div className="skeleton mb-8 h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton aspect-[4/3.6]" />
        ))}
      </div>
    </div>
  );
}
