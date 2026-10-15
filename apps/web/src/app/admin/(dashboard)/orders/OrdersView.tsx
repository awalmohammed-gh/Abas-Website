"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FiInbox, FiSearch } from "react-icons/fi";
import { ORDER_STATUSES, type OrderDTO, type OrderStatus, type Paginated, type StoreSettingsDTO } from "@aba-mart/shared";
import { ErrorBlock, FilterTabs, LoadingBlock, PageHeader, Panel, SimplePagination } from "@/components/admin/AdminUI";
import { OrderDetails } from "@/components/admin/OrderDetails";
import { OrderTable } from "@/components/admin/OrderTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

type StatusFilter = "all" | OrderStatus;

function OrdersContent() {
  const params = useSearchParams();
  const initial = params.get("status");
  const [status, setStatus] = useState<StatusFilter>(ORDER_STATUSES.includes(initial as OrderStatus) ? (initial as OrderStatus) : "all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OrderDTO | null>(null);
  const q = useDebounce(search.trim(), 350);

  const orders = useAdminResource<Paginated<OrderDTO>>(`/admin/orders${buildQuery({ status, q, page, limit: 20 })}`);
  const settings = useAdminResource<StoreSettingsDTO>("/admin/settings");

  // Deep link from the dashboard: /admin/orders?open=<id>
  const openId = params.get("open");
  useEffect(() => {
    if (!openId || !/^[a-f\d]{24}$/i.test(openId)) return;
    let cancelled = false;
    api
      .get<OrderDTO>(`/admin/orders/${openId}`)
      .then((order) => {
        if (!cancelled) setSelected(order);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [openId]);

  const result = orders.data;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders customers prepared on the website. A WhatsApp Pending order only becomes real once you receive the customer's message and confirm it."
      />
      <div className="mb-4 space-y-3">
        <FilterTabs<StatusFilter>
          label="Order status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[{ value: "all", label: "All" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s === "WhatsApp Pending" ? "Pending" : s }))]}
        />
        <div className="relative max-w-md">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Order reference, customer name or phone"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
      </div>

      <Panel>
        {orders.loading && !result ? (
          <LoadingBlock label="Loading orders" />
        ) : orders.error && !result ? (
          <ErrorBlock message={orders.error} onRetry={orders.reload} />
        ) : result && result.items.length === 0 ? (
          <EmptyState
            className="m-4 border-0"
            icon={<FiInbox />}
            title={q || status !== "all" ? "No orders match" : "No orders yet"}
            description={q || status !== "all" ? "Try a different status or search." : "When customers check out via WhatsApp, their orders are recorded here."}
          />
        ) : result ? (
          <div className={orders.loading ? "opacity-60 transition-opacity" : undefined}>
            <OrderTable orders={result.items} onOpen={setSelected} />
            <SimplePagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
          </div>
        ) : null}
      </Panel>
      {result && <p className="mt-3 text-xs text-muted">{result.total} order{result.total === 1 ? "" : "s"}</p>}

      {selected && (
        <OrderDetails
          key={selected.id}
          order={selected}
          storeName={settings.data?.storeName ?? "ABA Mart"}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setSelected(updated);
            orders.reload();
          }}
        />
      )}
    </>
  );
}

export function OrdersView() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading orders" />}>
      <OrdersContent />
    </Suspense>
  );
}
