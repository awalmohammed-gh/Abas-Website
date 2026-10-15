import { cn } from "@/lib/utils";

const LOW_STOCK = 5;

export function StockStatus({ stock, className }: { stock: number; className?: string }) {
  const state = stock <= 0 ? "out" : stock <= LOW_STOCK ? "low" : "in";
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        state === "out" ? "text-muted" : state === "low" ? "text-accent-700" : "text-success",
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", state === "out" ? "bg-muted" : state === "low" ? "bg-accent" : "bg-success")}
        aria-hidden="true"
      />
      {state === "out" ? "Out of stock" : state === "low" ? `Only ${stock} left` : "In stock"}
    </p>
  );
}
