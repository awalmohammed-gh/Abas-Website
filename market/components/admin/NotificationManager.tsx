"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiBell, FiExternalLink } from "react-icons/fi";
import { NOTIFICATION_TYPE_LABELS, type AdminNotificationDTO, type NotificationType, type Paginated } from "@aba-mart/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { ApiClientError, api } from "@/lib/api";
import { formatDateTime, formatRelativeTime } from "@/lib/time";
import { buildQuery, cn } from "@/lib/utils";
import { broadcastStoreEvent } from "@/lib/storeChannel";
import { useAdminSession } from "./AdminSession";
import { ADMIN_NOTIFICATIONS_CHANGED } from "./AdminNotificationBell";
import { ErrorBlock, FilterTabs, LoadingBlock, OrderStatusBadge, SimplePagination } from "./AdminUI";

export type NotificationScope = "all" | "alerts" | "customer";

const TYPE_TONES: Record<NotificationType, Parameters<typeof Badge>[0]["tone"]> = {
  new_product: "brand",
  promotion: "accent",
  announcement: "info",
  important: "warning",
  order_alert: "warning",
  order_update: "info",
};

function lifecycle(n: AdminNotificationDTO): { label: string; tone: Parameters<typeof Badge>[0]["tone"] } {
  if (n.status === "draft") return { label: "Draft", tone: "neutral" };
  if (n.expiresAt && Date.parse(n.expiresAt) <= Date.now()) return { label: "Ended", tone: "neutral" };
  return { label: "Published", tone: "success" };
}

function PushReport({ n }: { n: AdminNotificationDTO }) {
  const { push } = n;
  if (n.audience === "admin" || push.status === "not_sent") {
    return n.audience === "admin" ? null : <p className="text-xs text-muted">{n.status === "draft" ? (n.sendPush ? "Push will be sent when published." : "No push alert.") : "No push alert sent."}</p>;
  }
  if (push.status === "queued" || push.status === "sending") {
    return (
      <p className="text-xs text-muted">
        Sending push… {push.accepted + push.failed} of {push.targeted} processed
      </p>
    );
  }
  return (
    <div className="space-y-1 text-xs">
      <p className={cn(push.status === "failed" ? "text-danger" : "text-muted")}>
        Push {push.status === "failed" ? "stopped" : "finished"}: <strong className="text-ink">{push.accepted}</strong> accepted by push services of {push.targeted} targeted
        {push.failed > 0 && <> · {push.failed} failed</>}
        {push.deactivated > 0 && <> · {push.deactivated} expired subscription{push.deactivated === 1 ? "" : "s"} removed</>}
      </p>
      <p className="text-muted/80">Accepted means the browser&apos;s push service took the message; it doesn&apos;t confirm a device displayed it.</p>
      {push.errors.length > 0 && <p className="text-muted">Recent errors: {push.errors.join(" · ")}</p>}
    </div>
  );
}

function NotificationRow({ n, onChanged, checked, onSelect, selectionBusy, canManage }: { n: AdminNotificationDTO; onChanged: () => void; checked: boolean; onSelect: (checked: boolean) => void; selectionBusy: boolean; canManage: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const state = lifecycle(n);
  const isAlert = n.audience === "admin";
  const isSystem = isAlert || n.audience === "customer";

  async function act(action: "publish" | "end" | "delete" | "read") {
    if (action === "delete" && !window.confirm(`Delete “${n.title}”? Customers will no longer see it.`)) return;
    if (action === "publish" && !window.confirm(`Publish “${n.title}” to customers now?${n.sendPush ? " Push alerts will be sent." : ""}`)) return;
    setBusy(action);
    try {
      if (action === "publish") await api.post(`/admin/notifications/${n.id}/publish`);
      if (action === "end") await api.post(`/admin/notifications/${n.id}/end`);
      if (action === "delete") await api.delete(`/admin/notifications/${n.id}`);
      if (action === "read") await api.post("/admin/notifications/read", { ids: [n.id] });
      if (action !== "read") toast.success(action === "publish" ? "Published." : action === "end" ? "Notification ended." : "Notification deleted.");
      window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED));
      if (action !== "read") broadcastStoreEvent({ type: "notifications" });
      onChanged();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className={cn("flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-5", isAlert && !n.read && "bg-brand-50/50")}>
      {canManage && <label className="flex min-h-9 shrink-0 items-center gap-2">
        <input type="checkbox" className="size-4 accent-brand" aria-label={`Select ${n.title}`} checked={checked} disabled={selectionBusy || busy !== null || n.push.status === "queued" || n.push.status === "sending"} onChange={(event) => onSelect(event.target.checked)} />
        <span className="text-xs text-muted sm:sr-only">Select notification</span>
      </label>}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={TYPE_TONES[n.type]}>{NOTIFICATION_TYPE_LABELS[n.type]}</Badge>
          {!isAlert && <Badge tone={state.tone}>{state.label}</Badge>}
          {!isAlert && <Badge>{n.audience === "customer" ? "Order owner only" : n.audience === "public" ? "Everyone" : "Push subscribers"}</Badge>}
          {isSystem && n.orderStatus && <OrderStatusBadge status={n.orderStatus} />}
          {isAlert && !n.read && <span className="size-2 rounded-full bg-accent" aria-label="Unread" />}
        </div>
        <p className={cn("text-sm text-ink", isAlert && !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
        {n.message && <p className="text-sm text-muted">{n.message}</p>}
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span title={formatDateTime(n.publishedAt ?? n.createdAt)}>
            {n.publishedAt ? `Published ${formatRelativeTime(n.publishedAt)}` : `Created ${formatRelativeTime(n.createdAt)}`}
          </span>
          {n.createdBy && <span>by {n.createdBy.name}</span>}
          {n.expiresAt && <span>{state.label === "Ended" ? "Ended" : "Ends"} {formatDateTime(n.expiresAt)}</span>}
          {n.targetUrl && !isSystem && (
            <a href={n.targetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
              {n.targetUrl} <FiExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </p>
        <PushReport n={n} />
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {isSystem && n.orderId && (
          <Link
            href={`/admin/orders?open=${n.orderId}`}
            onClick={() => { if (!n.read) void act("read"); }}
            className="inline-flex min-h-9 items-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            Open order
          </Link>
        )}
        {isAlert && !n.read && (
          <Button size="sm" variant="secondary" loading={busy === "read"} onClick={() => void act("read")}>
            Mark read
          </Button>
        )}
        {canManage && !isSystem && n.status === "draft" && (
          <Button size="sm" loading={busy === "publish"} disabled={busy !== null} onClick={() => void act("publish")}>
            Publish
          </Button>
        )}
        {canManage && !isSystem && state.label === "Published" && (
          <Button size="sm" variant="secondary" loading={busy === "end"} disabled={busy !== null} onClick={() => void act("end")}>
            End now
          </Button>
        )}
        {canManage && <Button size="sm" variant="ghost" loading={busy === "delete"} disabled={selectionBusy || busy !== null || n.push.status === "sending" || n.push.status === "queued"} onClick={() => void act("delete")}>
          Delete
        </Button>}
      </div>
    </li>
  );
}

/** Notification history with publish, end and delete actions and push delivery results. */
export function NotificationManager({ initialScope = "all", refreshKey = 0, limit = 20, showFilters = true }: { initialScope?: NotificationScope; refreshKey?: number; limit?: number; showFilters?: boolean }) {
  const [scope, setScope] = useState<NotificationScope>(initialScope);
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<{ ids: string[]; all: boolean }>({ ids: [], all: false });
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const { admin } = useAdminSession();
  const canManage = admin.role === "super_admin" || admin.role === "admin";
  const list = useAdminResource<Paginated<AdminNotificationDTO>>(`/admin/notifications${buildQuery({ scope, page, limit, v: refreshKey || undefined })}`);
  const { reload } = list;
  const selectable = list.data?.items.filter((item) => item.push.status !== "queued" && item.push.status !== "sending") ?? [];
  const selectedIds = selectable.filter((item) => selection.ids.includes(item.id)).map((item) => item.id);
  const allOnPage = selectable.length > 0 && (selection.all || selectedIds.length === selectable.length);
  const selectedCount = selection.all ? list.data?.total ?? 0 : selectedIds.length;

  async function deleteSelected() {
    if (!window.confirm(`Delete ${selection.all ? "all notifications in this filter" : `${selectedCount} selected notifications`}? This removes them from customer feeds too. Notifications still being sent will be kept.`)) return;
    setDeleting(true);
    try {
      const result = await api.post<{ deleted: number; skipped: number }>("/admin/notifications/delete", selection.all ? { all: true, scope } : { ids: selectedIds, scope });
      toast.success(`${result.deleted} notification${result.deleted === 1 ? "" : "s"} deleted.${result.skipped ? ` ${result.skipped} still being sent were kept.` : ""}`);
      setSelection({ ids: [], all: false });
      setPage(1);
      reload();
      window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED));
      broadcastStoreEvent({ type: "notifications" });
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete notifications.");
    } finally {
      setDeleting(false);
    }
  }

  // Keep delivery progress current while a push is being sent.
  const sending = list.data?.items.some((n) => n.push.status === "queued" || n.push.status === "sending") ?? false;
  useEffect(() => {
    if (!sending) return;
    const timer = window.setInterval(reload, 4000);
    return () => window.clearInterval(timer);
  }, [sending, reload]);

  useEffect(() => {
    window.addEventListener(ADMIN_NOTIFICATIONS_CHANGED, reload);
    return () => window.removeEventListener(ADMIN_NOTIFICATIONS_CHANGED, reload);
  }, [reload]);

  return (
    <div>
      {showFilters && (
        <div className="border-b border-line px-3 py-2 sm:px-4">
          <FilterTabs
            label="Show"
            value={scope}
            onChange={(value) => {
              setScope(value);
              setPage(1);
              setSelection({ ids: [], all: false });
            }}
            options={[
              { value: "all", label: "All" },
              { value: "alerts", label: "Order alerts" },
              { value: "customer", label: "Customer notifications" },
            ]}
          />
        </div>
      )}
      {list.loading && !list.data ? (
        <LoadingBlock label="Loading notifications" />
      ) : list.error && !list.data ? (
        <ErrorBlock message={list.error} onRetry={reload} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState
          icon={<FiBell />}
          title={scope === "alerts" ? "No order alerts yet" : "No notifications yet"}
          description={scope === "alerts" ? "Each new WhatsApp checkout request creates an alert here." : "Published announcements appear in the customer notification bell."}
        />
      ) : list.data ? (
        <>
          {canManage && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 text-sm sm:px-5">
            <label className="flex min-h-9 items-center gap-2 font-medium">
              <input type="checkbox" className="size-4 accent-brand" checked={allOnPage} ref={(node) => { if (node) node.indeterminate = selectedIds.length > 0 && !allOnPage; }} disabled={deleting || selectable.length === 0 || list.loading} onChange={(event) => setSelection({ ids: event.target.checked ? selectable.map((item) => item.id) : [], all: false })} />
              Select all on this page
            </label>
            {allOnPage && !selection.all && list.data.total > list.data.items.length && <button type="button" className="min-h-9 font-semibold text-brand hover:underline" disabled={deleting} onClick={() => setSelection({ ids: [], all: true })}>Select all {list.data.total} in this filter</button>}
            {selection.all && <span className="text-muted">All {selectedCount} in this filter selected</span>}
            <Button size="sm" variant="danger" disabled={!selectedCount || list.loading} loading={deleting} onClick={() => void deleteSelected()}>Delete selected ({selectedCount})</Button>
          </div>}
          <ul className="divide-y divide-line">
            {list.data.items.map((n) => (
              <NotificationRow key={n.id} n={n} onChanged={reload} canManage={canManage} checked={selectable.some((item) => item.id === n.id) && (selection.all || selectedIds.includes(n.id))} selectionBusy={deleting || list.loading} onSelect={(checked) => setSelection({ all: false, ids: checked ? [...selectedIds, n.id] : (selection.all ? selectable.map((item) => item.id) : selectedIds).filter((id) => id !== n.id) })} />
            ))}
          </ul>
          <SimplePagination page={list.data.page} totalPages={list.data.totalPages} onChange={(next) => { if (!deleting) { setPage(next); setSelection({ ids: [], all: false }); } }} />
        </>
      ) : null}
    </div>
  );
}
