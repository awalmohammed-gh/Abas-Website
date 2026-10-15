"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FiPackage, FiPlus, FiSearch } from "react-icons/fi";
import type { AdminProductDTO, CategoryDTO, Paginated } from "@aba-mart/shared";
import { ErrorBlock, FilterTabs, LoadingBlock, PageHeader, Panel, SimplePagination } from "@/components/admin/AdminUI";
import { ProductTable } from "@/components/admin/ProductTable";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useDebounce } from "@/hooks/useDebounce";
import { api, errorMessage } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

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
  const q = useDebounce(search.trim(), 350);

  const categories = useAdminResource<CategoryDTO[]>("/admin/categories");
  const products = useAdminResource<Paginated<AdminProductDTO>>(
    `/admin/products${buildQuery({ q, status, stock: stock === "all" ? undefined : stock, category, page, limit: 20 })}`,
  );

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
    if (!window.confirm(`Archive "${product.name}"? It will be removed from the store but kept for order history. You can restore it later.`)) return;
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

  const result = products.data;

  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit, hide or archive products. Archived products stay in order history."
        actions={
          <ButtonLink href="/admin/products/new" leftIcon={<FiPlus className="size-4" aria-hidden="true" />}>
            Add product
          </ButtonLink>
        }
      />

      <div className="mb-4 space-y-3">
        <FilterTabs<Status>
          label="Product status"
          value={status}
          onChange={(v) => {
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
      </div>

      <Panel>
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
              busyId={busyId}
              onToggleActive={(p) => patch(p, { isActive: !p.isActive }, p.isActive ? `${p.name} is now hidden` : `${p.name} is now visible`)}
              onToggleFeatured={(p) => patch(p, { isFeatured: !p.isFeatured }, p.isFeatured ? `${p.name} removed from featured` : `${p.name} is featured`)}
              onArchive={archive}
              onRestore={restore}
            />
            <SimplePagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
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
