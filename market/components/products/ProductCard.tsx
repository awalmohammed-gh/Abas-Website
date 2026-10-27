import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { discountPercent, priceRange, type ProductDTO } from "@aba-mart/shared";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";
import { PriceTag } from "./PriceTag";
import { ProductImage } from "./ProductImage";

const LOW_STOCK = 5;
const SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 48vw";

/**
 * Image-first product card. The title link stretches over the whole card, so the card has a
 * single link; quick add (or "choose options" for products with variants) sits above it.
 */
export function ProductCard({ product, priority = false }: { product: ProductDTO; priority?: boolean }) {
  const href = `/products/${product.slug}`;
  const hasVariants = product.variants.length > 0;
  const range = priceRange(product);
  // A product-level discount applies when no variant overrides the price.
  const uniformPrice = product.variants.every((v) => v.price === null);
  const compareAtPrice = uniformPrice ? product.compareAtPrice : null;
  const discount = discountPercent(product.price, compareAtPrice);
  const soldOut = !product.inStock;
  const lowStock = !soldOut && product.stock <= LOW_STOCK;
  const [image, hoverImage] = product.images;
  const label = product.subCategory || product.category?.name;

  return (
    <article className={cn("group relative flex h-full min-w-0 flex-col", soldOut && "cursor-not-allowed")}>
      <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-cream-200">
        <ProductImage
          src={image?.url}
          alt={image?.alt || product.name}
          sizes={SIZES}
          priority={priority}
          className={cn(soldOut ? "opacity-45 grayscale" : "transition-[scale,opacity] duration-700 ease-out-soft group-hover:scale-[1.04]", !soldOut && hoverImage && "group-hover:opacity-0")}
        />
        {hoverImage && !soldOut && (
          <ProductImage
            src={hoverImage.url}
            alt=""
            sizes={SIZES}
            className="opacity-0 transition-opacity duration-700 ease-out-soft group-hover:opacity-100"
          />
        )}

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {discount && !soldOut && <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold leading-none text-brand-deep shadow-sm">-{discount}%</span>}
          {soldOut && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold leading-none text-white">Out of stock</span>}
        </div>

        {!soldOut && (
          <div
            className={cn(
              "absolute bottom-2.5 right-2.5 z-10 transition-[opacity,translate] duration-300 ease-out-soft",
              // Revealed on hover/focus with a mouse; always shown on touch screens.
              "[@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
            )}
          >
            {hasVariants ? (
              <Link
                href={href}
                aria-label={`Choose options for ${product.name}`}
                title="Choose options"
                className="inline-flex size-11 items-center justify-center rounded-full bg-white text-brand-deep shadow-pop ring-1 ring-black/5 transition-colors duration-200 hover:bg-brand hover:text-white"
              >
                <FiArrowUpRight className="size-5" aria-hidden="true" />
              </Link>
            ) : (
              <AddToCartButton
                compact
                line={{
                  productId: product.id,
                  variantId: null,
                  slug: product.slug,
                  name: product.name,
                  image: image?.url ?? null,
                  attributes: [],
                  unitPrice: product.price,
                  compareAtPrice: product.compareAtPrice,
                  maxQuantity: product.stock,
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col gap-1 px-0.5 pt-3", soldOut && "opacity-60")}>
        {label && <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink sm:text-[15px]">
          {soldOut ? <span>{product.name}</span> : <Link href={href} className="transition-colors duration-200 before:absolute before:inset-0 before:rounded-2xl group-hover:text-brand focus-visible:outline-none focus-visible:before:outline-2 focus-visible:before:outline-offset-4 focus-visible:before:outline-brand">
            {product.name}
          </Link>}
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <PriceTag price={range.min} maxPrice={range.max} compareAtPrice={compareAtPrice} />
          {lowStock && <span className="text-xs font-medium text-accent-700">Only {product.stock} left</span>}
          {soldOut && <span className="text-xs font-medium text-muted">Out of stock</span>}
        </div>
      </div>
    </article>
  );
}
