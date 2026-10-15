import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { discountPercent, formatGHS } from "@aba-mart/shared";
import { ProductImage } from "@/components/products/ProductImage";
import { getProducts } from "@/lib/catalog";

/** Real discounted products only. The section is hidden when nothing is on sale. */
export async function Promotions() {
  const result = await getProducts({ onSale: true, limit: 3, availability: "in-stock" });
  if (!result?.items.length) return null;

  const best = Math.max(0, ...result.items.map((p) => discountPercent(p.price, p.compareAtPrice) ?? 0));

  return (
    <section className="container-page py-14 sm:py-16" aria-labelledby="deals-heading">
      <div className="overflow-hidden rounded-3xl bg-accent-50 ring-1 ring-accent/30">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Deals</p>
            <h2 id="deals-heading" className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
              {best > 0 ? `Save up to ${best}% today` : "Special prices this week"}
            </h2>
            <p className="mt-3 text-muted">Discounted while stock lasts. Prices are confirmed with you on WhatsApp.</p>
            <Link
              href="/shop?sort=price-asc"
              className="mt-6 inline-flex items-center gap-2 font-semibold text-brand hover:underline"
            >
              Shop all products <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {result.items.map((product) => (
              <li key={product.id}>
                <Link href={`/products/${product.slug}`} className="group block overflow-hidden rounded-2xl bg-white shadow-card">
                  <div className="relative aspect-[4/3] bg-cream-200">
                    <ProductImage src={product.images[0]?.url} alt={product.name} sizes="(min-width: 640px) 220px, 90vw" />
                    {discountPercent(product.price, product.compareAtPrice) && (
                      <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-brand-deep">
                        -{discountPercent(product.price, product.compareAtPrice)}%
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-ink group-hover:text-brand">{product.name}</p>
                    <p className="mt-0.5 text-sm">
                      <span className="font-bold text-ink">{formatGHS(product.price)}</span>
                      {product.compareAtPrice && <span className="ml-2 text-xs text-muted line-through">{formatGHS(product.compareAtPrice)}</span>}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
