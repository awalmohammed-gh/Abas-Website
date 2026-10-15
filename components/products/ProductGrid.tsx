import type { ReactNode } from "react";
import type { ProductDTO } from "@aba-mart/shared";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";

const GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5";

export function ProductGrid({
  products,
  empty,
  priorityCount = 0,
  className,
}: {
  products: ProductDTO[];
  empty?: ReactNode;
  priorityCount?: number;
  className?: string;
}) {
  if (!products.length) return <>{empty ?? null}</>;
  return (
    <ul className={cn(GRID, className)}>
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <ul className={cn(GRID, className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-card border border-line bg-white">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-3 sm:p-4">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-5 w-1/2" />
            <div className="skeleton h-9 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
