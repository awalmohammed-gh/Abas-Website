"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { FiLayers, FiSearch } from "react-icons/fi";
import type { InventoryRow, Paginated } from "@aba-mart/shared";
import { ErrorBlock, FilterTabs, LoadingBlock, PageHeader, Panel, SimplePagination, StockBadge } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useDebounce } from "@/hooks/useDebounce";
import { api, errorMessage } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

type StateFilter = "all" | "low_stock" | "out_of_stock" | "in_stock";

function StockEditor({ row, onSaved }: { row: InventoryRow; onSaved: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState(String(row.stock));
  const [saving, setSaving] = useState(false);
  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 1_000_000;
  const changed = valid && parsed !== row.stock;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setSaving(true);
    try {
      await api.patch(`/admin/inventory/${row.productId}`, { variantId: row.variantId, stock: parsed });
      toast.success(`${row.productName}${row.variantLabel ? ` (${row.variantLabel})` : ""}: stock set to ${parsed}`);
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`stock-${row.productId}-${row.variantId ?? "base"}`}>
        Stock for {row.productName} {row.variantLabel ?? ""}
      </label>
      <input
        id={`stock-${row.productId}-${row.variantId ?? "base"}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        aria-invalid={!valid || undefined}
        className="h-10 w-20 rounded-lg border border-line px-3 text-sm font-semibold aria-invalid:border-danger"
      />
      <Button type="submit" size="sm" variant={changed ? "primary" : "secondary"} disabled={!changed} loading={saving}>
        Save
      </Button>
    </form>
  );
}

function InventoryContent() {
  const params = useSearchParams();
  const initial = params.get("state");
  const [state, setState] = useState<StateFilter>(initial === "low_stock" || initial === "out_of_stock" || initial === "in_stock" ? initial : "all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim(), 350);
  const { data, error, loading, reload } = useAdminResource<Paginated<InventoryRow>>(`/admin/inventory${buildQuery({ state, q, page, limit: 50 })}`);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock is tracked per product, or per variant for products with options. Confirming an order deducts stock automatically; cancelling a confirmed order returns it."
      />
      <div className="mb-4 space-y-3">
        <FilterTabs<StateFilter>
          label="Stock level"
          value={state}
          onChange={(v) => {
            setState(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "low_stock", label: "Low stock" },
            { value: "out_of_stock", label: "Out of stock" },
            { value: "in_stock", label: "In stock" },
          ]}
        />
        <div className="relative max-w-md">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="inventory-search" className="sr-only">
            Search inventory
          </label>
          <input
            id="inventory-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product name or SKU"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
      </div>

      <Panel>
        {loading && !data ? (
          <LoadingBlock label="Loading inventory" />
        ) : error && !data ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : data && data.items.length === 0 ? (
          <EmptyState className="m-4 border-0" icon={<FiLayers />} title="Nothing to show" description={state === "all" && !q ? "Add products to start tracking stock." : "No items match this filter."} />
        ) : data ? (
          <div className={loading ? "opacity-60 transition-opacity" : undefined}>
            <ul className="divide-y divide-line">
              {data.items.map((row) => (
                <li key={`${row.productId}-${row.variantId ?? "base"}`} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-cream-200">
                    <Image src={row.image || "/images/placeholders/product.svg"} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${row.productId}/edit`} className="line-clamp-1 font-semibold text-ink hover:text-brand">
                      {row.productName}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {[row.variantLabel, row.sku && `SKU ${row.sku}`, row.categoryName, `alert at ${row.lowStockThreshold}`].filter(Boolean).join(" · ")}
                      {!row.isActive && " · not for sale"}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                    <StockBadge state={row.state} />
                    <StockEditor key={`${row.stock}`} row={row} onSaved={reload} />
                  </div>
                </li>
              ))}
            </ul>
            <SimplePagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </div>
        ) : null}
      </Panel>
    </>
  );
}

export function InventoryView() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading inventory" />}>
      <InventoryContent />
    </Suspense>
  );
}
