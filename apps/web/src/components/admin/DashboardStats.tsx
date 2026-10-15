import Link from "next/link";
import type { IconType } from "react-icons";
import { FiAlertTriangle, FiBox, FiCheckCircle, FiClock, FiPackage, FiShoppingCart, FiTruck, FiXCircle } from "react-icons/fi";
import { formatGHS, type DashboardSummary } from "@aba-mart/shared";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string | number;
  icon: IconType;
  href: string;
  tone: "brand" | "accent" | "danger" | "success" | "neutral";
  note?: string;
}

const TONES = {
  brand: "bg-brand-50 text-brand",
  accent: "bg-accent-50 text-accent-700",
  danger: "bg-danger-50 text-danger",
  success: "bg-success-50 text-success",
  neutral: "bg-cream-200 text-muted",
};

export function DashboardStats({ summary }: { summary: DashboardSummary }) {
  const { products, orders } = summary;
  const productStats: Stat[] = [
    { label: "Total products", value: products.total, icon: FiBox, href: "/admin/products", tone: "brand" },
    { label: "Active products", value: products.active, icon: FiCheckCircle, href: "/admin/products?status=active", tone: "success" },
    { label: "Out of stock", value: products.outOfStock, icon: FiXCircle, href: "/admin/inventory?state=out_of_stock", tone: products.outOfStock ? "danger" : "neutral" },
    { label: "Low stock", value: products.lowStock, icon: FiAlertTriangle, href: "/admin/inventory?state=low_stock", tone: products.lowStock ? "accent" : "neutral" },
  ];
  const orderStats: Stat[] = [
    { label: "WhatsApp orders", value: orders.total, icon: FiShoppingCart, href: "/admin/orders", tone: "brand", note: "All recorded orders" },
    { label: "Pending", value: orders.pending, icon: FiClock, href: "/admin/orders?status=WhatsApp%20Pending", tone: orders.pending ? "accent" : "neutral", note: "Awaiting your confirmation" },
    { label: "Confirmed", value: orders.confirmed, icon: FiPackage, href: "/admin/orders?status=Confirmed", tone: "brand" },
    { label: "In progress", value: orders.inProgress, icon: FiTruck, href: "/admin/orders", tone: "neutral", note: "Processing, pickup or delivery" },
    {
      label: "Completed",
      value: orders.completed,
      icon: FiCheckCircle,
      href: "/admin/orders?status=Completed",
      tone: "success",
      note: orders.completed ? `${formatGHS(orders.completedValue)} in orders you marked completed` : "No completed orders yet",
    },
  ];

  const card = (stat: Stat) => (
    <li key={stat.label}>
      <Link href={stat.href} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-card">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONES[stat.tone])}>
          <stat.icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-muted">{stat.label}</span>
          <span className="block font-display text-2xl font-bold text-ink">{stat.value}</span>
          {stat.note && <span className="mt-0.5 block text-xs text-muted">{stat.note}</span>}
        </span>
      </Link>
    </li>
  );

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">{productStats.map(card)}</ul>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{orderStats.map(card)}</ul>
    </div>
  );
}
