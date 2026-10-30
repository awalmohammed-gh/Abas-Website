import Link from "next/link";
import { FiArrowUpRight, FiBox, FiCreditCard, FiLayers, FiShoppingCart } from "react-icons/fi";
import { formatGHS, type DashboardSummary } from "@aba-mart/shared";
import { cn } from "@/lib/utils";

export function DashboardStats({ summary }: { summary: DashboardSummary }) {
  const { products, orders } = summary;
  const alerts = products.lowStock + products.outOfStock;
  const stats = [
    { label: "Completed order value", value: formatGHS(orders.completedValue), note: `From ${orders.completed} completed order${orders.completed === 1 ? "" : "s"}`, href: "/admin/orders?status=Completed", icon: FiCreditCard, featured: true },
    { label: "Products", value: products.total, note: `${products.active} active in your catalogue`, href: "/admin/products", icon: FiBox },
    { label: "WhatsApp orders", value: orders.total, note: `${orders.pending} awaiting confirmation`, href: "/admin/orders", icon: FiShoppingCart },
    { label: "Stock alerts", value: alerts, note: `${products.lowStock} low stock / ${products.outOfStock} out of stock`, href: "/admin/inventory", icon: FiLayers },
  ];

  return (
    <ul aria-label="Store key figures" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {stats.map(({ label, value, note, href, icon: Icon, featured }) => (
        <li key={label}>
          <Link href={href} className={cn("group flex h-full min-w-0 flex-col rounded-2xl border p-5 transition-shadow hover:shadow-card", featured ? "border-brand bg-brand text-white" : "border-line bg-white text-ink")}>
            <span className="flex items-center justify-between gap-3">
              <span className={cn("flex size-10 items-center justify-center rounded-xl", featured ? "bg-white/10 text-white" : "bg-cream text-brand")}><Icon className="size-[18px]" aria-hidden="true" /></span>
              <FiArrowUpRight className={cn("size-4", featured ? "text-white/55 group-hover:text-white" : "text-muted/60 group-hover:text-brand")} aria-hidden="true" />
            </span>
            <span className={cn("mt-5 text-xs font-medium", featured ? "text-white/75" : "text-muted")}>{label}</span>
            <span className="mt-1 break-words font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
            <span className={cn("mt-2 text-xs leading-relaxed", featured ? "text-white/65" : "text-muted")}>{note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}