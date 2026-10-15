import Link from "next/link";
import { FiArrowRight, FiEye } from "react-icons/fi";
import { discountPercent, priceRange, type ProductDTO } from "@aba-mart/shared";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";
import { PriceTag } from "./PriceTag";
import { ProductImage } from "./ProductImage";
import { StockStatus } from "./StockStatus";

export function ProductCard({ product, priority = false }: { product: ProductDTO; priority?: boolean }) {
  const href = `/products/${product.slug}`;
  const hasVariants = product.variants.length > 0;
  const range = priceRange(product);
  // A product-level discount applies when no variant overrides the price.
  const uniformPrice = product.variants.every((v) => v.price === null);
  const compareAtPrice = uniformPrice ? product.compareAtPrice : null;
  const discount = discountPercent(product.price, compareAtPrice);
  const soldOut = !product.inStock;

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-shadow hover:shadow-pop/40">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-cream-200" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.images[0]?.url}
          alt={product.images[0]?.alt || product.name}
          sizes="(min-width: 1280px) 290px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 48vw"
          priority={priority}
          className={cn("transition-transform duration-500 group-hover:scale-[1.04]", soldOut && "opacity-60 grayscale-35")}
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-brand-deep">-{discount}%</span>}
          {soldOut && <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">Sold out</span>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        {(product.subCategory || product.category) && (
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{product.subCategory || product.category?.name}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink sm:text-[15px]">
          <Link href={href} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto space-y-1">
          <PriceTag price={range.min} maxPrice={range.max} compareAtPrice={compareAtPrice} />
          <StockStatus stock={product.stock} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {hasVariants ? (
            <ButtonLink href={href} size="sm" className="min-w-24 flex-1" variant={soldOut ? "secondary" : "primary"} rightIcon={<FiArrowRight className="size-4" aria-hidden="true" />}>
              Options
            </ButtonLink>
          ) : (
            <div className="min-w-24 max-w-full flex-1">
              <AddToCartButton
                disabled={soldOut}
                label={soldOut ? "Sold out" : "Add"}
                line={{
                  productId: product.id,
                  variantId: null,
                  slug: product.slug,
                  name: product.name,
                  image: product.images[0]?.url ?? null,
                  attributes: [],
                  unitPrice: product.price,
                  compareAtPrice: product.compareAtPrice,
                  maxQuantity: product.stock,
                }}
              />
            </div>
          )}
          <ButtonLink href={href} size="icon" variant="secondary" className="size-9 rounded-lg" aria-label={`View details for ${product.name}`}>
            <FiEye className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
