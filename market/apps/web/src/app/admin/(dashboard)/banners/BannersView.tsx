"use client";

import Image from "next/image";
import { useState } from "react";
import { FiArrowDown, FiArrowUp, FiEdit2, FiEye, FiEyeOff, FiImage, FiPlus, FiTrash2 } from "react-icons/fi";
import type { BannerDTO } from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { api, errorMessage } from "@/lib/api";
import { BannerForm } from "@/components/admin/BannerForm";
import { confirm } from "@/components/ui/ConfirmDialog";

export function BannersView() {
  const toast = useToast();
  const { data, error, loading, reload } = useAdminResource<BannerDTO[]>("/admin/banners");
  const [editing, setEditing] = useState<BannerDTO | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  /** Swaps display order with the neighbour, renumbering so orders are always distinct. */
  function move(index: number, delta: -1 | 1) {
    if (!data) return;
    const ordered = [...data];
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
    const updates = ordered.map((b, i) => ({ banner: b, order: i })).filter(({ banner, order }) => banner.displayOrder !== order);
    void run(() => Promise.all(updates.map(({ banner, order }) => api.patch(`/admin/banners/${banner.id}`, { displayOrder: order }))), "Banner order updated");
  }

  const iconButton = "inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand disabled:opacity-30";

  return (
    <>
      <PageHeader
        title="Banners"
        description="Homepage hero banners. Changes appear on the storefront without touching code."
        actions={
          <Button leftIcon={<FiPlus className="size-4" aria-hidden="true" />} onClick={() => setEditing("new")}>
            New banner
          </Button>
        }
      />
      <Panel>
        {loading && !data ? (
          <LoadingBlock label="Loading banners" />
        ) : error && !data ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : data && data.length === 0 ? (
          <EmptyState
            className="m-4 border-0"
            icon={<FiImage />}
            title="No banners yet"
            description="Without banners, the homepage shows a branded introduction. Add a banner to promote a category or offer."
            action={<Button onClick={() => setEditing("new")}>Create a banner</Button>}
          />
        ) : data ? (
          <ul className="divide-y divide-line">
            {data.map((banner, index) => (
              <li key={banner.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
                <div className="relative aspect-[8/3] w-full shrink-0 overflow-hidden rounded-xl border border-line bg-cream-200 sm:w-56">
                  <Image src={banner.desktopImage.url} alt="" fill sizes="(min-width: 640px) 224px, 100vw" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{banner.title}</p>
                    {banner.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
                    {!banner.mobileImage && <Badge tone="warning">No mobile image</Badge>}
                  </div>
                  {banner.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{banner.description}</p>}
                  {banner.buttonText && (
                    <p className="mt-0.5 text-xs text-muted">
                      Button: “{banner.buttonText}” → {banner.buttonLink}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 self-end sm:self-auto">
                  <button type="button" className={iconButton} disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up" title="Move up">
                    <FiArrowUp className="size-4" />
                  </button>
                  <button type="button" className={iconButton} disabled={busy || index === data.length - 1} onClick={() => move(index, 1)} aria-label="Move down" title="Move down">
                    <FiArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    disabled={busy}
                    onClick={() => run(() => api.patch(`/admin/banners/${banner.id}`, { isActive: !banner.isActive }), banner.isActive ? "Banner deactivated" : "Banner activated")}
                    aria-label={banner.isActive ? "Deactivate banner" : "Activate banner"}
                    title={banner.isActive ? "Deactivate" : "Activate"}
                  >
                    {banner.isActive ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                  </button>
                  <button type="button" className={iconButton} onClick={() => setEditing(banner)} aria-label={`Edit ${banner.title}`} title="Edit">
                    <FiEdit2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={`${iconButton} hover:bg-danger-50 hover:text-danger`}
                    disabled={busy}
                    onClick={async () => {
                      const ok = await confirm({ title: `Delete the banner "${banner.title}"?`, description: "It disappears from the homepage straight away. This cannot be undone.", tone: "danger" });
                      if (ok) void run(() => api.delete(`/admin/banners/${banner.id}`), "Banner deleted");
                    }}
                    aria-label={`Delete ${banner.title}`}
                    title="Delete"
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
        <BannerForm
          key={editing === "new" ? "new" : editing.id}
          banner={editing === "new" ? null : editing}
          nextOrder={data?.length ?? 0}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast.success(editing === "new" ? "Banner created" : "Banner saved");
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
