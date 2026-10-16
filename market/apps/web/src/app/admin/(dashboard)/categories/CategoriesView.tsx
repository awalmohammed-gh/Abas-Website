"use client";

import Image from "next/image";
import { useState } from "react";
import { FiEdit2, FiEye, FiEyeOff, FiGrid, FiPlus, FiTrash2 } from "react-icons/fi";
import type { CategoryDTO } from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from "@/components/admin/AdminUI";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { api, errorMessage } from "@/lib/api";
import { confirm } from "@/components/ui/ConfirmDialog";

export function CategoriesView() {
  const toast = useToast();
  const { data, error, loading, reload } = useAdminResource<CategoryDTO[]>("/admin/categories");
  const [editing, setEditing] = useState<CategoryDTO | null | "new">(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(category: CategoryDTO) {
    setBusyId(category.id);
    try {
      await api.patch(`/admin/categories/${category.id}`, { isActive: !category.isActive });
      toast.success(category.isActive ? `${category.name} hidden from the store` : `${category.name} is visible`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(category: CategoryDTO) {
    if (!(await confirm({ title: `Delete the "${category.name}" category?`, description: "This cannot be undone.", tone: "danger" }))) return;
    setBusyId(category.id);
    try {
      await api.delete(`/admin/categories/${category.id}`);
      toast.success(`${category.name} deleted`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const iconButton = "inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand disabled:opacity-40";

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise products into categories. A category with products can be hidden but not deleted."
        actions={
          <Button leftIcon={<FiPlus className="size-4" aria-hidden="true" />} onClick={() => setEditing("new")}>
            New category
          </Button>
        }
      />
      <Panel>
        {loading && !data ? (
          <LoadingBlock label="Loading categories" />
        ) : error && !data ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : data && data.length === 0 ? (
          <EmptyState
            className="m-4 border-0"
            icon={<FiGrid />}
            title="No categories yet"
            description="Create categories like Bathing Soaps, Skincare or Clothing, then add products to them."
            action={<Button onClick={() => setEditing("new")}>Create a category</Button>}
          />
        ) : data ? (
          <ul className="divide-y divide-line">
            {data.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line bg-cream-200">
                  {category.image ? (
                    <Image src={category.image.url} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-brand/40">{category.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{category.name}</p>
                  <p className="truncate text-xs text-muted">
                    /categories/{category.slug} · {category.productCount ?? 0} product{category.productCount === 1 ? "" : "s"} · order {category.displayOrder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {category.isActive ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}
                  <button type="button" className={iconButton} onClick={() => setEditing(category)} aria-label={`Edit ${category.name}`} title="Edit">
                    <FiEdit2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    disabled={busyId === category.id}
                    onClick={() => toggle(category)}
                    aria-label={category.isActive ? `Hide ${category.name}` : `Show ${category.name}`}
                    title={category.isActive ? "Hide" : "Show"}
                  >
                    {category.isActive ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                  </button>
                  <button
                    type="button"
                    className={`${iconButton} hover:bg-danger-50 hover:text-danger`}
                    disabled={busyId === category.id}
                    onClick={() => remove(category)}
                    aria-label={`Delete ${category.name}`}
                    title={(category.productCount ?? 0) > 0 ? "Move or archive its products first" : "Delete"}
                  >
                    <FiTrash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {editing !== null && (
        <CategoryForm
          key={editing === "new" ? "new" : editing.id}
          open
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            toast.success(editing === "new" ? `${saved.name} created` : `${saved.name} saved`);
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
