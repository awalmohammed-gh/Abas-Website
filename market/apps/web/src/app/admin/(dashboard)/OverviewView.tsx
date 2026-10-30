"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiArrowUpRight, FiBox, FiCheckCircle, FiClock, FiGrid, FiImage, FiPackage, FiPlus, FiRefreshCw, FiShoppingCart, FiTruck, FiXCircle } from "react-icons/fi";
import type { DashboardSummary } from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader, Panel, StockBadge } from "@/components/admin/AdminUI";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { useAdminSession } from "@/components/admin/AdminSession";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useAdminResource } from "@/hooks/useAdminResource";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { title: "Manage products", description: "Edit details, prices and store visibility.", href: "/admin/products", icon: FiBox },
  { title: "Organise categories", description: "Make it easy for customers to find products.", href: "/admin/categories", icon: FiGrid },
  { title: "Update store banners", description: "Highlight products and offers on your homepage.", href: "/admin/banners", icon: FiImage },
];

export function OverviewView() {
  const { admin } = useAdminSession();
  const { data, error, loading, reload } = useAdminResource<DashboardSummary>("/admin/dashboard");
  const orderStatuses = data ? [
    { label: "Awaiting confirmation", value: data.orders.pending, href: "/admin/orders?status=WhatsApp%20Pending", icon: FiClock, tone: "text-accent-700 bg-accent-50" },
    { label: "Confirmed", value: data.orders.confirmed, href: "/admin/orders?status=Confirmed", icon: FiPackage, tone: "text-brand bg-brand-50" },
    { label: "In progress", value: data.orders.inProgress, href: "/admin/orders", icon: FiTruck, tone: "text-brand bg-brand-50" },
    { label: "Completed", value: data.orders.completed, href: "/admin/orders?status=Completed", icon: FiCheckCircle, tone: "text-success bg-success-50" },
    { label: "Cancelled", value: data.orders.cancelled, href: "/admin/orders?status=Cancelled", icon: FiXCircle, tone: "text-muted bg-cream" },
  ] : [];

  return (
    <>
      <PageHeader
        title="Your store at a glance"
        description={`Welcome back, ${admin.name.split(" ")[0]}. Here is how your store is doing.`}
        actions={<>
          <Button variant="secondary" onClick={reload} disabled={loading} aria-label={loading ? "Refreshing overview" : "Refresh overview"} leftIcon={<FiRefreshCw className={cn("size-4", loading && "motion-safe:animate-spin")} aria-hidden="true" />}>Refresh</Button>
          <ButtonLink href="/" external variant="secondary" rightIcon={<FiArrowUpRight className="size-4" aria-hidden="true" />}>View store<span className="sr-only"> (opens in a new tab)</span></ButtonLink>
        </>}
      />

      {loading && !data ? <LoadingBlock label="Loading overview" /> : error && !data ? <ErrorBlock message={error} onRetry={reload} /> : data ? (
        <div className="space-y-6" aria-busy={loading}>
          {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm text-danger"><p>Could not refresh the overview. Showing the last available figures.</p><Button size="sm" variant="secondary" onClick={reload}>Try again</Button></div>}
          <DashboardStats summary={data} />

          <Panel title="Order overview" actions={<Link href="/admin/orders" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-brand hover:underline">Manage orders <FiArrowRight aria-hidden="true" /></Link>}>
            <div className="px-4 pt-4 sm:px-5"><p className="text-xs text-muted">Confirm WhatsApp requests after receiving the customer's message. View all order details on the Orders page.</p></div>
            <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-4 xl:grid-cols-5">
              {orderStatuses.map(({ label, value, href, icon: Icon, tone }) => (
                <li key={label}><Link href={href} className="group flex h-full flex-col gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-line hover:bg-cream/70">
                  <span className={cn("flex size-9 items-center justify-center rounded-xl", tone)}><Icon className="size-4" aria-hidden="true" /></span>
                  <span><span className="block font-display text-2xl font-semibold tabular-nums text-ink">{value}</span><span className="mt-1 block text-xs text-muted">{label}</span></span>
                </Link></li>
              ))}
            </ul>
          </Panel>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title="Stock that needs attention" actions={<Link href="/admin/inventory" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-brand hover:underline">Inventory <FiArrowRight aria-hidden="true" /></Link>}>
              {data.lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-success-50 text-success"><FiCheckCircle className="size-6" aria-hidden="true" /></span>
                  <h3 className="text-base font-semibold text-ink">{data.products.active ? "Your stock is looking good" : "Ready for your products"}</h3>
                  <p className="mt-2 max-w-xs text-sm text-muted">{data.products.active ? "No active products need restocking right now." : "Add a product and its stock to get started. Low-stock alerts will appear here."}</p>
                  <ButtonLink href={data.products.active ? "/admin/inventory" : "/admin/products/new"} variant="secondary" size="sm" className="mt-5">{data.products.active ? "View inventory" : "Add your first product"}</ButtonLink>
                </div>
              ) : (
                <>
                  <p className="px-4 pt-4 text-xs text-muted sm:px-5">Low and out-of-stock items, starting with the lowest quantities.</p>
                  <ul className="mt-3 divide-y divide-line">
                    {data.lowStockItems.map((row) => (
                      <li key={`${row.productId}-${row.variantId ?? "base"}`}>
                        <Link href="/admin/inventory" className="group flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-cream/60 sm:px-5">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-cream"><Image src={row.image || "/images/placeholders/product.svg"} alt="" fill sizes="48px" className="object-cover" /></div>
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{row.productName}</p>{row.variantLabel && <p className="mt-1 truncate text-xs text-muted">{row.variantLabel}</p>}</div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5"><span className="text-sm font-semibold tabular-nums text-ink">{row.stock} left</span><StockBadge state={row.state} /></div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            <div className="min-w-0 space-y-6">
              <section className="relative overflow-hidden rounded-2xl border border-brand bg-brand-deep p-5 text-white sm:p-6">
                <FiShoppingCart aria-hidden="true" className="pointer-events-none absolute -right-4 -top-3 size-28 -rotate-12 text-white/5" />
                <span className="inline-flex rounded-lg bg-white/10 p-2.5"><FiPlus className="size-5 text-accent" aria-hidden="true" /></span>
                <h2 className="relative mt-4 text-xl font-semibold">Something new to sell?</h2>
                <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-white/70">Add photos, a price and any sizes or colours. Your customers can take it from there on WhatsApp.</p>
                <ButtonLink href="/admin/products/new" variant="accent" className="relative mt-5" leftIcon={<FiPlus className="size-4" aria-hidden="true" />}>Add product</ButtonLink>
              </section>
              <Panel title="Quick actions">
                <ul className="divide-y divide-line">
                  {QUICK_ACTIONS.map(({ title, description, href, icon: Icon }) => (
                    <li key={href}><Link href={href} className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-cream/60 sm:px-5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand"><Icon className="size-[18px]" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{title}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span></span>
                      <FiArrowUpRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-brand" aria-hidden="true" />
                    </Link></li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
