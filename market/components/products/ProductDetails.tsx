"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiMinus, FiPlus, FiTruck } from "react-icons/fi";
import { LIMITS, resolvePrice, type ProductDTO, type ProductVariantDTO } from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import type { CartLineInput } from "@/types/cart";
import { AddToCartButton } from "./AddToCartButton";
import { PriceTag } from "./PriceTag";
import { ProductImage } from "./ProductImage";
import { StockStatus } from "./StockStatus";

type Selection = Record<string, string | undefined>;

function matches(variant: ProductVariantDTO, selection: Selection, ignore?: string) {
  return variant.attributes.every((a) => a.name === ignore || !selection[a.name] || selection[a.name] === a.value);
}

function Gallery({ product }: { product: ProductDTO }) {
  const [active, setActive] = useState(0);
  const images = product.images;
  const current = images[active] ?? images[0];

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-cream-200">
        <ProductImage
          src={current?.url}
          alt={current?.alt || product.name}
          sizes="(min-width: 1024px) 560px, 100vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <ul className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain p-1" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image.publicId} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === active ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-xl border-2 bg-cream-200 sm:size-20",
                  index === active ? "border-brand" : "border-transparent opacity-75 hover:opacity-100",
                )}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductDetails({ product, whatsappEnabled, whatsappNotice }: { product: ProductDTO; whatsappEnabled: boolean; whatsappNotice?: string | null }) {
  const router = useRouter();
  const { addItem, lines, hydrated, pending, error: cartError } = useCart();
  const hasVariants = product.variants.length > 0;

  const [selection, setSelection] = useState<Selection>(() =>
    product.variants.length === 1 ? Object.fromEntries(product.variants[0]!.attributes.map((a) => [a.name, a.value])) : {},
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () =>
      hasVariants && product.options.every((o) => selection[o.name])
        ? product.variants.find((v) => v.attributes.every((a) => selection[a.name] === a.value)) ?? null
        : null,
    [hasVariants, product, selection],
  );

  const missingOptions = product.options.filter((o) => !selection[o.name]).map((o) => o.name.toLowerCase());
  const pricing = resolvePrice(product, selectedVariant);
  const stock = hasVariants ? (selectedVariant ? selectedVariant.stock : product.stock) : product.stock;
  const inCart = lines.find((l) => l.productId === product.id && l.variantId === (selectedVariant?.id ?? null))?.quantity ?? 0;
  const maxSelectable = Math.max(0, Math.min(stock - inCart, LIMITS.maxLineQuantity - inCart));
  const safeQuantity = Math.min(Math.max(1, quantity), Math.max(1, maxSelectable));
  const canBuy = (!hasVariants || !!selectedVariant) && stock > 0 && maxSelectable > 0;

  const line: CartLineInput = {
    productId: product.id,
    variantId: selectedVariant?.id ?? null,
    slug: product.slug,
    name: product.name,
    image: product.images[0]?.url ?? null,
    attributes: selectedVariant?.attributes ?? [],
    unitPrice: pricing.price,
    compareAtPrice: pricing.compareAtPrice,
    maxQuantity: stock,
  };

  async function orderNow() {
    if (!canBuy) return;
    try {
      await addItem(line, safeQuantity);
      router.push("/cart?checkout=1");
    } catch {
      // The shared cart error below explains why the item could not be added.
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <Gallery product={product} />

      <div className="space-y-6">
        <div className="space-y-3">
          {(product.category || product.subCategory) && (
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">{[product.category?.name, product.subCategory].filter(Boolean).join(" · ")}</p>
          )}
          <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl">{product.name}</h1>
          <PriceTag price={pricing.price} compareAtPrice={pricing.compareAtPrice} size="lg" />
          <StockStatus stock={stock} className="text-sm" />
        </div>

        {hasVariants && (
          <div className="space-y-5">
            {product.options.map((option) => (
              <fieldset key={option.name}>
                <legend className="mb-2 text-sm font-semibold text-ink">
                  {option.name}
                  {selection[option.name] && <span className="ml-1.5 font-normal text-muted">{selection[option.name]}</span>}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const candidates = product.variants.filter(
                      (v) => matches(v, selection, option.name) && v.attributes.some((a) => a.name === option.name && a.value === value),
                    );
                    const exists = candidates.length > 0;
                    const available = candidates.some((v) => v.stock > 0);
                    const selected = selection[option.name] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        disabled={!exists}
                        onClick={() => {
                          setSelection((s) => ({ ...s, [option.name]: selected ? undefined : value }));
                          setQuantity(1);
                        }}
                        className={cn(
                          "min-h-11 min-w-12 rounded-xl border px-4 text-sm font-medium transition-colors",
                          selected ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand",
                          !available && !selected && "text-muted line-through decoration-muted/70",
                          !exists && "cursor-not-allowed opacity-40",
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-line bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-ink" id="qty-label">
              Quantity
            </span>
            <div className="flex items-center rounded-xl border border-line" role="group" aria-labelledby="qty-label">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={safeQuantity <= 1}
                className="flex size-11 items-center justify-center text-ink disabled:opacity-35"
                aria-label="Decrease quantity"
              >
                <FiMinus />
              </button>
              <output className="w-10 text-center font-semibold" aria-live="polite">
                {safeQuantity}
              </output>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxSelectable, q + 1))}
                disabled={safeQuantity >= maxSelectable}
                className="flex size-11 items-center justify-center text-ink disabled:opacity-35"
                aria-label="Increase quantity"
              >
                <FiPlus />
              </button>
            </div>
          </div>

          {hasVariants && missingOptions.length > 0 && (
            <p className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-700">Please select a {missingOptions.join(" and ")} to continue.</p>
          )}
          {inCart > 0 && <p className="text-xs text-muted">{inCart} already in your cart.</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            <AddToCartButton line={line} quantity={safeQuantity} disabled={!canBuy} size="lg" label={stock <= 0 && (!hasVariants || selectedVariant) ? "Out of stock" : "Add to cart"} />
            <Button
              variant="whatsapp"
              size="lg"
              onClick={orderNow}
              disabled={!canBuy || !whatsappEnabled || !hydrated || pending}
              leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}
            >
              Order via WhatsApp
            </Button>
          </div>
          {!whatsappEnabled && <p className="text-xs text-muted">{whatsappNotice ?? "WhatsApp ordering is being set up. Please check back soon."}</p>}
            {cartError && <p role="alert" className="text-sm text-danger">{cartError}</p>}
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <FiTruck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            Delivery or pickup is arranged with you directly on WhatsApp after you send your order.
          </p>
        </div>

      </div>
    </div>
  );
}
