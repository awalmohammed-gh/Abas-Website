"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import { formatGHS, type DashboardSummary } from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, OrderStatusBadge, PageHeader, Panel, StockBadge } from "@/components/admin/AdminUI";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { useAdminSession } from "@/components/admin/AdminSession";
import { ButtonLink } from "@/components/ui/Button";
import { useAdminResource } from "@/hooks/useAdminResource";
import { formatDateTime } from "@/lib/utils";

export function OverviewView() {
  const { admin } = useAdminSession();
  const { data, error, loading, reload } = useAdminResource<DashboardSummary>("/admin/dashboard");

  return (
    <>
      <PageHeader
        title={`Welcome back, ${admin.name.split(" ")[0]}`}
        description="Live figures from your store database."
        actions={
          <ButtonLink href="/admin/products/new" leftIcon={<FiPlus className="size-4" aria-hidden="true" />}>
            Add product
          </ButtonLink>
        }
      />

      {loading && !data ? (
        <LoadingBlock label="Loading dashboard" />
      ) : error && !data ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : data ? (
        <div className="space-y-6">
          <DashboardStats summary={data} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel
              title="Recent orders"
              actions={
                <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                  All orders <FiArrowRight aria-hidden="true" />
                </Link>
              }
            >
              {data.recentOrders.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted">No orders yet. Orders appear here when customers check out via WhatsApp.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.recentOrders.map((order) => (
                    <li key={order.id}>
                      <Link href={`/admin/orders?open=${order.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cream sm:px-5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">
                            {order.orderReference} <span className="font-normal text-muted">· {order.customer.name}</span>
                          </p>
                          <p className="text-xs text-muted">
                            {formatDateTime(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-ink">{formatGHS(order.total)}</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Low and out of stock"
              actions={
                <Link href="/admin/inventory" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                  Inventory <FiArrowRight aria-hidden="true" />
                </Link>
              }
            >
              {data.lowStockItems.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted">Every active product is above its low-stock level.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.lowStockItems.map((row) => (
                    <li key={`${row.productId}-${row.variantId ?? "base"}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-cream-200">
                        <Image src={row.image || "/images/placeholders/product.svg"} alt="" fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{row.productName}</p>
                        {row.variantLabel && <p className="truncate text-xs text-muted">{row.variantLabel}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-ink">{row.stock} left</span>
                        <StockBadge state={row.state} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </>
  );
}
