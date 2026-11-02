import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { discountPercent, priceRange, resolvePrice, type ProductDTO } from "@aba-mart/shared";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";
import { PriceTag } from "./PriceTag";
import { ProductImage } from "./ProductImage";
import { WishlistButton } from "./WishlistButton";

const LOW_STOCK = 5;
const SIZES = "(min-width: 1280px) 240px, (min-width: 1024px) 20vw, (min-width: 640px) 31vw, 48vw";

/**
 * Image-first product card. The title link stretches over the whole card, so the card has a
 * clear destination; the visible purchase action sits above the stretched link.
 */
export function ProductCard({ product, priority = false, layout = "grid" }: { product: ProductDTO; priority?: boolean; layout?: "grid" | "list" }) {
  const list = layout === "list";
  const href = `/products/${product.slug}`;
  const hasVariants = product.variants.length > 0;
  // With a single size there is nothing to choose, so the card adds that size directly.
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const onlyVariant = activeVariants.length === 1 ? activeVariants[0]! : null;
  const needsChoice = hasVariants && !onlyVariant;
  const onlyPricing = onlyVariant ? resolvePrice(product, onlyVariant) : null;
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
    <article data-layout={layout} className={cn("group relative flex h-full min-w-0 rounded-2xl border border-line bg-white p-2.5 transition-[border-color,box-shadow] hover:border-brand/25 hover:shadow-card sm:p-3", list ? "items-center gap-3 sm:gap-5" : "flex-col")}>
      <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-[#f5f5f1]", list && "w-28 shrink-0 sm:w-44")}>
        <ProductImage
          src={image?.url}
          alt={image?.alt || product.name}
          sizes={SIZES}
          priority={priority}
          fit="contain"
          className={cn(soldOut ? "opacity-80" : "transition-[scale,opacity] duration-700 ease-out-soft group-hover:scale-[1.04]", !soldOut && hoverImage && "group-hover:opacity-0")}
        />
        {hoverImage && !soldOut && (
          <ProductImage
            src={hoverImage.url}
            alt=""
            sizes={SIZES}
            fit="contain"
            className="opacity-0 transition-opacity duration-700 ease-out-soft group-hover:opacity-100"
          />
        )}

        <WishlistButton id={product.id} name={product.name} />
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {discount && !soldOut && <span className="rounded-md bg-[#f53625] px-2 py-1 text-[11px] font-bold leading-none text-white shadow-sm">-{discount}%</span>}
          {soldOut && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold leading-none text-white">Out of stock</span>}
        </div>
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", list && "self-stretch justify-center")}>
        <div className={cn("flex flex-col gap-1 px-0.5", list ? "pt-0" : "flex-1 pt-3")}>
          {label && <p className="product-card-label truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink sm:text-[15px]">
            <Link href={href} className="transition-colors duration-200 before:absolute before:inset-0 before:rounded-2xl group-hover:text-brand focus-visible:outline-none focus-visible:before:outline-2 focus-visible:before:outline-offset-4 focus-visible:before:outline-brand">
              {product.name}
            </Link>
          </h3>
          <div className={cn("mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1", list ? "gap-x-4" : "justify-between")}>
            <PriceTag price={range.min} maxPrice={range.max} compareAtPrice={compareAtPrice} />
            {lowStock && <span className="text-xs font-medium text-accent-700">Only {product.stock} left</span>}
            {soldOut && <span className="text-xs font-medium text-muted">Out of stock</span>}
          </div>
        </div>
        <div className={cn("relative z-10 mt-3", list && "sm:max-w-56")}>
          {soldOut ? <button type="button" disabled className="min-h-11 w-full rounded-lg bg-brand px-2 py-2 text-xs font-semibold text-white opacity-50">Out of stock</button> : needsChoice ? <Link href={href} aria-label={`Choose options for ${product.name}`} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700">Choose options<FiArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" /></Link> : <AddToCartButton
            size="sm"
            className="min-h-11 text-xs"
            line={onlyVariant && onlyPricing
              ? { productId: product.id, variantId: onlyVariant.id, slug: product.slug, name: product.name, image: image?.url ?? null, attributes: onlyVariant.attributes, unitPrice: onlyPricing.price, compareAtPrice: onlyPricing.compareAtPrice, maxQuantity: onlyVariant.stock }
              : { productId: product.id, variantId: null, slug: product.slug, name: product.name, image: image?.url ?? null, attributes: [], unitPrice: product.price, compareAtPrice: product.compareAtPrice, maxQuantity: product.stock }}
          />}
        </div>
      </div>
    </article>
  );
}
