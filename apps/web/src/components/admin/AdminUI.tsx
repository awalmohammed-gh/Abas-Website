import type { ReactNode } from "react";
import { FiAlertCircle } from "react-icons/fi";
import type { OrderStatus } from "@aba-mart/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-[1.7rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
          {title && <h2 className="font-display text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner className="text-brand" label={label} /> {label}…
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <FiAlertCircle className="size-7 text-danger" aria-hidden="true" />
      <p className="max-w-md text-sm text-ink">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

const STATUS_TONES: Record<OrderStatus, Parameters<typeof Badge>[0]["tone"]> = {
  "WhatsApp Pending": "warning",
  Confirmed: "info",
  Processing: "brand",
  "Ready for Pickup": "brand",
  "Out for Delivery": "brand",
  Completed: "success",
  Cancelled: "neutral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{status}</Badge>;
}

export function StockBadge({ state }: { state: "in_stock" | "low_stock" | "out_of_stock" }) {
  if (state === "out_of_stock") return <Badge tone="danger">Out of stock</Badge>;
  if (state === "low_stock") return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="success">In stock</Badge>;
}

/** Segmented filter used above admin lists. Scrolls horizontally on phones. */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
            value === option.value ? "bg-brand text-white" : "bg-white text-ink ring-1 ring-line hover:bg-brand-50",
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-xs", value === option.value ? "bg-white/20" : "bg-cream-200 text-muted")}>{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SimplePagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm sm:px-5">
      <p className="text-muted">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
