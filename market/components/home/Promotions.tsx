import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { discountPercent } from "@aba-mart/shared";
import { RevealOnScroll } from "@/components/animations/RevealOnScroll";
import { ProductCard } from "@/components/products/ProductCard";
import { getProducts } from "@/lib/catalog";

/** Real discounted products only. The section is hidden when nothing is on sale. */
export async function Promotions() {
  const result = await getProducts({ onSale: true, limit: 3 });
  if (!result?.items.length) return null;

  const best = Math.max(0, ...result.items.filter((product) => product.inStock).map((p) => discountPercent(p.price, p.compareAtPrice) ?? 0));

  return (
    <section className="container-page py-14 sm:py-16" aria-labelledby="deals-heading">
      <RevealOnScroll className="overflow-hidden rounded-3xl bg-accent-50 ring-1 ring-accent/30" duration={0.5}>
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Deals</p>
            <h2 id="deals-heading" className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
              {best > 0 ? `Save up to ${best}% today` : "Special prices this week"}
            </h2>
            <p className="mt-3 text-muted">Discounted while stock lasts. Prices are confirmed with you on WhatsApp.</p>
            <Link
              href="/shop?sort=price-asc"
              className="group mt-6 inline-flex items-center gap-2 font-semibold text-brand hover:underline"
            >
              Shop all products <FiArrowRight className="transition-transform duration-200 ease-out-soft group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {result.items.map((product) => (
              <li key={product.id} className="rounded-2xl bg-white p-3 shadow-card">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      </RevealOnScroll>
    </section>
  );
}
