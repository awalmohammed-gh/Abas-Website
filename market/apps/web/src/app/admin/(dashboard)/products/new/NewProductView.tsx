"use client";

import type { CategoryDTO } from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/admin/AdminUI";
import { ProductForm } from "@/components/admin/ProductForm";
import { useAdminResource } from "@/hooks/useAdminResource";

export function NewProductView() {
  const categories = useAdminResource<CategoryDTO[]>("/admin/categories");
  return (
    <>
      <PageHeader title="Add product" description="Products appear in the store as soon as they're saved and marked visible." />
      {categories.loading ? (
        <LoadingBlock />
      ) : categories.error ? (
        <ErrorBlock message={categories.error} onRetry={categories.reload} />
      ) : (
        <ProductForm categories={categories.data ?? []} />
      )}
    </>
  );
}
