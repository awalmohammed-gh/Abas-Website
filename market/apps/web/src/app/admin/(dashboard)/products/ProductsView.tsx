"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { FiPackage, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import type { AdminProductDTO, CategoryDTO, Paginated } from "@aba-mart/shared";
import { ErrorBlock, FilterTabs, LoadingBlock, PageHeader, Panel, SimplePagination } from "@/components/admin/AdminUI";
import { ProductTable } from "@/components/admin/ProductTable";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useDebounce } from "@/hooks/useDebounce";
import { api, errorMessage } from "@/lib/api";
import { buildQuery } from "@/lib/utils";
import { confirm } from "@/components/ui/ConfirmDialog";
import { broadcastStoreEvent } from "@/lib/storeChannel";

type Status = "all" | "active" | "inactive" | "archived";
type StockFilter = "all" | "in" | "low" | "out";

function ProductsContent() {
  const params = useSearchParams();
  const toast = useToast();
  const initialStatus = params.get("status");
  const [status, setStatus] = useState<Status>(
    initialStatus === "active" || initialStatus === "inactive" || initialStatus === "archived" ? initialStatus : "all",
  );
  const [stock, setStock] = useState<StockFilter>("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ scope: string; ids: string[] }>({ scope: "", ids: [] });
  const selectPageRef = useRef<HTMLInputElement>(null);
  const q = useDebounce(search.trim(), 350);

  const categories = useAdminResource<CategoryDTO[]>("/admin/categories");
  const products = useAdminResource<Paginated<AdminProductDTO>>(
    `/admin/products${buildQuery({ q, status, stock: stock === "all" ? undefined : stock, category, page, limit: 20 })}`,
  );

  // Selection is limited to the visible page and clears as soon as filters or page change.
  const selectionScope = JSON.stringify([search, status, stock, category, page]);
  const visibleIds = new Set(products.data?.items.map((product) => product.id) ?? []);
  const selectedIds = new Set(selection.scope === selectionScope ? selection.ids.filter((id) => visibleIds.has(id)) : []);
  const selectedCount = selectedIds.size;
  const allSelected = visibleIds.size > 0 && selectedCount === visibleIds.size;
  const partiallySelected = selectedCount > 0 && !allSelected;
  const listBusy = busyId !== null || products.loading || search.trim() !== q;

  useEffect(() => {
    if (selectPageRef.current) selectPageRef.current.indeterminate = partiallySelected;
  }, [partiallySelected, products.data]);

  function toggleSelection(id: string, selected: boolean) {
    if (listBusy || !visibleIds.has(id)) return;
    setSelection({ scope: selectionScope, ids: selected ? [...new Set([...selectedIds, id])] : [...selectedIds].filter((value) => value !== id) });
  }

  async function deleteSelected() {
    if (listBusy || !selectedCount) return;
    const ids = [...selectedIds];
    const names = (products.data?.items ?? []).filter((product) => selectedIds.has(product.id)).map((product) => product.name);
    if (!(await confirm({
      title: `Permanently delete ${ids.length} selected product${ids.length === 1 ? "" : "s"}?`,
      description: <div className="space-y-3"><p>This permanently removes these products from the database and storefront. It cannot be undone. Existing order details are kept.</p><ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">{names.map((name, index) => <li key={ids[index]}>{name}</li>)}</ul></div>,
      confirmLabel: `Delete ${ids.length} product${ids.length === 1 ? "" : "s"}`,
      cancelLabel: "Keep products",
      tone: "danger",
    }))) return;
    setBusyId("bulk-delete");
    try {
      const result = await api.post<{ ids: string[]; deletedCount: number }>("/admin/products/bulk-delete", { ids });
      toast.success(`${result.deletedCount} product${result.deletedCount === 1 ? "" : "s"} permanently deleted`);
      setSelection({ scope: selectionScope, ids: [] });
      broadcastStoreEvent({ type: "notifications" });
      if (ids.length === products.data?.items.length && page > 1) setPage(page - 1);
      else products.reload();
    } catch (error) {
      toast.error(errorMessage(error));
      // Refresh stale selections after a concurrent deletion or an uncertain network response.
      setSelection({ scope: selectionScope, ids: [] });
      products.reload();
    } finally {
      setBusyId(null);
    }
  }

  async function patch(product: AdminProductDTO, body: object, success: string) {
    setBusyId(product.id);
    try {
      await api.patch(`/admin/products/${product.id}`, body);
      toast.success(success);
      products.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function archive(product: AdminProductDTO) {
    if (!(await confirm({ title: `Archive "${product.name}"?`, description: "It will be removed from the store but kept for order history. You can restore it later.", confirmLabel: "Archive", tone: "danger" }))) return;
    setBusyId(product.id);
    try {
      await api.delete(`/admin/products/${product.id}`);
      toast.success(`${product.name} archived`);
      products.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function restore(product: AdminProductDTO) {
    setBusyId(product.id);
    try {
      await api.post(`/admin/products/${product.id}/restore`);
      toast.success(`${product.name} restored as hidden. Show it when you're ready.`);
      products.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function permanentlyDelete(product: AdminProductDTO) {
    if (busyId) return;
    if (!(await confirm({
      title: `Permanently delete "${product.name}"?`,
      description: "This removes the product from the database and storefront. It cannot be restored. Existing orders keep their recorded item details.",
      confirmLabel: "Delete permanently",
      cancelLabel: "Keep product",
      tone: "danger",
    }))) return;
    setBusyId(product.id);
    try {
      await api.delete(`/admin/products/${product.id}/permanent`);
      toast.success(`${product.name} permanently deleted`);
      broadcastStoreEvent({ type: "notifications" });
      if (products.data?.items.length === 1 && page > 1) setPage(page - 1);
      else products.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  const result = products.data;

  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit, hide, archive or permanently delete products."
        actions={
          <ButtonLink href="/admin/products/new" leftIcon={<FiPlus className="size-4" aria-hidden="true" />}>
            Add product
          </ButtonLink>
        }
      />

      <fieldset disabled={busyId !== null} className="mb-4 min-w-0 space-y-3">
        <legend className="sr-only">Product filters</legend>
        <FilterTabs<Status>
          label="Product status"
          value={status}
          onChange={(v) => {
            setSelection({ scope: "", ids: [] });
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Hidden" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_160px]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label htmlFor="admin-product-search" className="sr-only">
              Search products
            </label>
            <input
              id="admin-product-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSelection({ scope: "", ids: [] });
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or SKU"
              className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setSelection({ scope: "", ids: [] });
              setCategory(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-line bg-white px-3 text-sm"
          >
            <option value="">All categories</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by stock"
            value={stock}
            onChange={(e) => {
              setSelection({ scope: "", ids: [] });
              setStock(e.target.value as StockFilter);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-line bg-white px-3 text-sm"
          >
            <option value="all">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
      </fieldset>

      <Panel>
        {result && result.items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-3 sm:p-4">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
              <input ref={selectPageRef} type="checkbox" checked={allSelected} aria-checked={partiallySelected ? "mixed" : allSelected} disabled={listBusy} onChange={(event) => setSelection({ scope: selectionScope, ids: event.target.checked ? [...visibleIds] : [] })} className="size-5 accent-brand" />
              Select this page ({result.items.length})
            </label>
            <span className="text-sm text-muted" role="status">{selectedCount} selected</span>
            {selectedCount > 0 && <button type="button" disabled={listBusy} onClick={() => setSelection({ scope: selectionScope, ids: [] })} className="min-h-11 px-2 text-sm font-semibold text-brand disabled:opacity-50">Clear selection</button>}
            <Button type="button" variant="danger" className="ml-auto" disabled={listBusy || !selectedCount} loading={busyId === "bulk-delete"} onClick={() => void deleteSelected()} leftIcon={<FiTrash2 className="size-4" aria-hidden="true" />}>Delete selected{selectedCount > 0 ? ` (${selectedCount})` : ""}</Button>
          </div>
        )}
        {products.loading && !result ? (
          <LoadingBlock label="Loading products" />
        ) : products.error && !result ? (
          <ErrorBlock message={products.error} onRetry={products.reload} />
        ) : result && result.items.length === 0 ? (
          <EmptyState
            className="m-4 border-0"
            icon={<FiPackage />}
            title={q || status !== "all" || category || stock !== "all" ? "No products match these filters" : "No products yet"}
            description={q || status !== "all" ? "Try another search or filter." : "Add your first product to start selling."}
            action={<ButtonLink href="/admin/products/new">Add product</ButtonLink>}
          />
        ) : result ? (
          <div className={products.loading ? "opacity-60 transition-opacity" : undefined}>
            <ProductTable
              products={result.items}
              busyId={busyId ?? (listBusy ? "loading" : null)}
              selectedIds={selectedIds}
              onSelectionChange={toggleSelection}
              onToggleActive={(p) => patch(p, { isActive: !p.isActive }, p.isActive ? `${p.name} is now hidden` : `${p.name} is now visible`)}
              onToggleFeatured={(p) => patch(p, { isFeatured: !p.isFeatured }, p.isFeatured ? `${p.name} removed from featured` : `${p.name} is featured`)}
              onArchive={archive}
              onRestore={restore}
              onDelete={permanentlyDelete}
            />
            <SimplePagination page={result.page} totalPages={result.totalPages} onChange={(nextPage) => { if (!busyId) { setSelection({ scope: "", ids: [] }); setPage(nextPage); } }} />
          </div>
        ) : null}
      </Panel>
      {result && <p className="mt-3 text-xs text-muted">{result.total} product{result.total === 1 ? "" : "s"}</p>}
    </>
  );
}

export function ProductsView() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading products" />}>
      <ProductsContent />
    </Suspense>
  );
}
