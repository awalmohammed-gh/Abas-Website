"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiBell, FiShoppingCart, FiX } from "react-icons/fi";
import { NOTIFICATION_POLL_MS, type AdminNotificationDTO, type AdminNotificationSummary } from "@aba-mart/shared";
import { useToast } from "@/components/ui/Toast";
import { usePolling } from "@/hooks/usePolling";
import { api, errorMessage } from "@/lib/api";
import { useAdminSession } from "./AdminSession";
import { formatDateTime, formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { OrderStatusBadge } from "./AdminUI";
import { confirm } from "@/components/ui/ConfirmDialog";

export const ADMIN_NOTIFICATIONS_CHANGED = "aba:admin-notifications-changed";

/** Only dashboard paths may be opened from an alert. */
const adminHref = (url: string) => (/^\/admin(\/|\?|$)/.test(url) ? url : "/admin/notifications");

/**
 * Dashboard alerts (pending checkout requests). Polls a small summary every
 * 15 seconds while the tab is visible; the request carries the admin session
 * cookie, so order details never reach anyone else.
 */
export function AdminNotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<AdminNotificationSummary | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const newest = useRef<string | null | undefined>(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const { admin } = useAdminSession();
  const canManage = admin.role === "super_admin" || admin.role === "admin";
  const selectedIds = summary?.latest.filter((item) => selected.includes(item.id)).map((item) => item.id) ?? [];
  const allSelected = !!summary?.latest.length && selectedIds.length === summary.latest.length;

  const load = useCallback(async () => {
    const next = await api.get<AdminNotificationSummary>("/admin/notifications/summary");
    const latest = next.latest[0];
    // Announce alerts that arrived since the last poll (not the ones present on first load).
    if (newest.current !== undefined && latest && latest.publishedAt && latest.publishedAt !== newest.current) {
      const fresh = next.latest.filter((n) => !n.read && n.publishedAt && (!newest.current || n.publishedAt > newest.current));
      if (fresh.length === 1) toast.success(fresh[0]!.title);
      else if (fresh.length > 1) toast.success(`${fresh.length} new pending checkout requests`);
    }
    newest.current = latest?.publishedAt ?? null;
    setSummary(next);
  }, [toast]);

  usePolling(load, NOTIFICATION_POLL_MS.admin);

  useEffect(() => {
    const reload = () => void load().catch(() => undefined);
    window.addEventListener(ADMIN_NOTIFICATIONS_CHANGED, reload);
    return () => window.removeEventListener(ADMIN_NOTIFICATIONS_CHANGED, reload);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = async (ids: string[] | "all") => {
    setSummary((s) =>
      s ? { unreadCount: ids === "all" ? 0 : Math.max(0, s.unreadCount - ids.length), latest: s.latest.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read: true } : n)) } : s,
    );
    try {
      await api.post("/admin/notifications/read", ids === "all" ? { all: true } : { ids });
      window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED));
    } catch {
      void load().catch(() => undefined);
    }
  };

  const openAlert = (alert: AdminNotificationDTO) => {
    if (!alert.read) void markRead([alert.id]);
    setOpen(false);
    router.push(adminHref(alert.targetUrl));
  };

  const unread = summary?.unreadCount ?? 0;

  async function deleteAlerts(all = false) {
    if (all && !(await confirm({ title: "Delete all order alerts?", description: "Order records will be kept.", confirmLabel: "Delete all", tone: "danger" }))) return;
    const count = selectedIds.length;
    setDeleting(true);
    try {
      await api.post("/admin/notifications/delete", all ? { all: true, scope: "alerts" } : { ids: selectedIds, scope: "alerts" });
      setSelected([]);
      await load();
      window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED));
      toast.success(all ? "All order alerts deleted." : `${count} alert${count === 1 ? "" : "s"} deleted.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="admin-alerts"
        aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}
        className="relative inline-flex size-11 items-center justify-center rounded-xl text-ink hover:bg-brand-50"
      >
        <FiBell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-brand-deep ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          id="admin-alerts"
          role="dialog"
          aria-label="Alerts"
          className="fixed left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] top-[calc(4.25rem+env(safe-area-inset-top))] z-50 flex max-h-[calc(100dvh-5.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[24rem]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold text-ink">Order alerts</h2>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button type="button" onClick={() => void markRead("all")} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-50">
                  Mark all as read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-cream" aria-label="Close alerts">
                <FiX className="size-4" />
              </button>
            </div>
          </div>
          {canManage && !!summary?.latest.length && <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2 text-xs">
            <label className="flex min-h-9 items-center gap-2 font-medium text-ink">
              <input type="checkbox" className="size-4 accent-brand" checked={allSelected} ref={(node) => { if (node) node.indeterminate = selectedIds.length > 0 && !allSelected; }} disabled={deleting} onChange={(event) => setSelected(event.target.checked ? summary.latest.map((item) => item.id) : [])} />
              Select all shown
            </label>
            <button type="button" disabled={deleting || selectedIds.length === 0} onClick={() => void deleteAlerts()} className="min-h-9 font-semibold text-danger disabled:opacity-40">Delete selected ({selectedIds.length})</button>
            <button type="button" disabled={deleting} onClick={() => void deleteAlerts(true)} className="min-h-9 font-semibold text-danger disabled:opacity-40">Delete all alerts</button>
          </div>}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {!summary ? (
              <p className="px-3 py-8 text-center text-sm text-muted">Loading…</p>
            ) : summary.latest.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">No alerts yet. New WhatsApp checkout requests appear here.</p>
            ) : (
              <ul className="space-y-1">
                {summary.latest.map((alert) => (
                  <li key={alert.id} className="flex items-start gap-1">
                    {canManage && <label className="flex min-h-11 shrink-0 items-center px-2">
                      <input type="checkbox" className="size-4 accent-brand" aria-label={`Select ${alert.title}`} checked={selectedIds.includes(alert.id)} disabled={deleting} onChange={(event) => setSelected((current) => event.target.checked ? [...current, alert.id] : current.filter((id) => id !== alert.id))} />
                    </label>}
                    <button
                      type="button"
                      onClick={() => openAlert(alert)}
                      className={cn("flex min-w-0 flex-1 gap-3 rounded-xl p-3 text-left hover:bg-cream", !alert.read && "bg-brand-50/60")}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700" aria-hidden="true">
                        <FiShoppingCart className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm text-ink", !alert.read && "font-semibold")}>{alert.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{alert.message}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          {alert.orderStatus && <OrderStatusBadge status={alert.orderStatus} />}
                          {alert.publishedAt && (
                            <time dateTime={alert.publishedAt} title={formatDateTime(alert.publishedAt)} className="text-xs text-muted">
                              {formatRelativeTime(alert.publishedAt)}
                            </time>
                          )}
                        </span>
                      </span>
                      {!alert.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link href="/admin/notifications" onClick={() => setOpen(false)} className="shrink-0 border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand hover:bg-brand-50">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
