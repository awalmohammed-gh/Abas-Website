"use client";

import { FiExternalLink } from "react-icons/fi";
import type { AdminProductDTO, CategoryDTO } from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/admin/AdminUI";
import { ProductForm } from "@/components/admin/ProductForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { useAdminResource } from "@/hooks/useAdminResource";

export function ProductEditor({ id }: { id: string }) {
  const product = useAdminResource<AdminProductDTO>(/^[a-f\d]{24}$/i.test(id) ? `/admin/products/${id}` : null);
  const categories = useAdminResource<CategoryDTO[]>("/admin/categories");

  if (!/^[a-f\d]{24}$/i.test(id)) return <ErrorBlock message="This product link is not valid." />;
  if (product.loading || categories.loading) return <LoadingBlock label="Loading product" />;
  if (product.error || !product.data) return <ErrorBlock message={product.error ?? "Product not found."} onRetry={product.reload} />;
  if (categories.error) return <ErrorBlock message={categories.error} onRetry={categories.reload} />;

  const data = product.data;
  return (
    <>
      <PageHeader
        title={data.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {data.isArchived ? <Badge>Archived</Badge> : data.isActive ? <Badge tone="success">Visible in store</Badge> : <Badge>Hidden</Badge>}
            <span>Last updated {new Date(data.updatedAt).toLocaleString("en-GB")}</span>
          </span>
        }
        actions={
          data.isActive && !data.isArchived ? (
            <ButtonLink href={`/products/${data.slug}`} external variant="secondary" leftIcon={<FiExternalLink className="size-4" aria-hidden="true" />}>
              View in store
            </ButtonLink>
          ) : undefined
        }
      />
      <ProductForm key={data.updatedAt} product={data} categories={categories.data ?? []} />
    </>
  );
}
