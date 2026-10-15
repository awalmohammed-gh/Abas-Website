import { discountPercent, formatGHS } from "@aba-mart/shared";
import { cn } from "@/lib/utils";

interface PriceTagProps {
  price: number;
  compareAtPrice?: number | null;
  /** When a product's variants have different prices. */
  maxPrice?: number;
  size?: "sm" | "lg";
  className?: string;
}

export function PriceTag({ price, compareAtPrice, maxPrice, size = "sm", className }: PriceTagProps) {
  const discount = discountPercent(price, compareAtPrice);
  const isRange = maxPrice !== undefined && maxPrice > price;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-display font-bold text-ink", size === "lg" ? "text-3xl" : "text-base sm:text-lg")}>
        {isRange && <span className="mr-1 text-xs font-medium text-muted">From</span>}
        {formatGHS(price)}
      </span>
      {discount && compareAtPrice && (
        <>
          <span className={cn("text-muted line-through", size === "lg" ? "text-lg" : "text-xs sm:text-sm")}>
            <span className="sr-only">Was </span>
            {formatGHS(compareAtPrice)}
          </span>
          {size === "lg" && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-brand-deep">Save {discount}%</span>
          )}
        </>
      )}
    </div>
  );
}
