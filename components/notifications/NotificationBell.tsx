"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiAlertTriangle, FiBell, FiGift, FiInfo, FiPackage, FiTruck, FiX } from "react-icons/fi";
import { NOTIFICATION_TYPE_LABELS, type CustomerNotificationDTO, type CustomerNotificationType } from "@aba-mart/shared";
import { Toggle } from "@/components/ui/Input";
import { useNotifications } from "@/contexts/NotificationsContext";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { formatDateTime, formatRelativeTime } from "@/lib/time";

const TYPE_ICONS: Record<CustomerNotificationType, IconType> = {
  new_product: FiPackage,
  promotion: FiGift,
  announcement: FiInfo,
  important: FiAlertTriangle,
  order_update: FiTruck,
};

function NotificationItem({ item, onOpen }: { item: CustomerNotificationDTO; onOpen: () => void }) {
  const Icon = TYPE_ICONS[item.type];
  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
          item.type === "important" ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand",
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {NOTIFICATION_TYPE_LABELS[item.type]}
          {!item.read && <span className="size-2 rounded-full bg-accent" aria-label="Unread" />}
        </span>
        <span className={cn("mt-0.5 block text-sm text-ink", !item.read && "font-semibold")}>{item.title}</span>
        {item.message && <span className="mt-0.5 line-clamp-3 block text-sm text-muted">{item.message}</span>}
        <time dateTime={item.publishedAt} title={formatDateTime(item.publishedAt)} className="mt-1 block text-xs text-muted">
          {formatRelativeTime(item.publishedAt)}
        </time>
      </span>
    </>
  );
  const className = cn("flex min-w-0 flex-1 gap-3 rounded-xl p-3 text-left transition-colors hover:bg-cream", !item.read && "bg-brand-50/50");
  return item.targetUrl ? (
    <Link href={item.targetUrl} onClick={onOpen} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onOpen} className={className}>
      {body}
    </button>
  );
}

function PushControls({ storeName }: { storeName: string }) {
  const { push, enablePush, disablePush } = useNotifications();
  if (!push.available || push.support === "insecure") return null;

  let content: ReactNode;
  if (push.support === "needs-install") {
    content = (
      <p className="text-xs leading-relaxed text-muted">
        On iPhone and iPad, add {storeName} to your Home Screen (Share → Add to Home Screen), then open it from there to turn on alerts.
      </p>
    );
  } else if (push.support === "unsupported") {
    content = <p className="text-xs text-muted">This browser doesn&apos;t support push alerts. New updates still appear here.</p>;
  } else if (push.permission === "denied") {
    content = <p className="text-xs text-muted">Alerts are blocked for this site in your browser settings. Allow them there to receive updates on this device.</p>;
  } else if (push.subscribed) {
    content = (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Alerts are on for this device.</p>
        <button type="button" onClick={() => void disablePush()} disabled={push.busy} className="text-xs font-semibold text-brand hover:underline disabled:opacity-50">
          Turn off
        </button>
      </div>
    );
  } else {
    content = (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Get alerts on this device, even when this tab is closed.</p>
        <button
          type="button"
          onClick={() => void enablePush()}
          disabled={push.busy}
          className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
        >
          Enable
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {content}
      {push.error && <p role="alert" className="text-xs text-danger">{push.error}</p>}
    </div>
  );
}

export function NotificationBell({ storeName }: { storeName: string }) {
  const { feed, error, markRead, deleteNotifications, setPreferences } = useNotifications();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const unread = feed?.unreadCount ?? 0;
  const items = feed?.items ?? [];
  const selectedIds = items.filter((item) => selected.includes(item.id)).map((item) => item.id);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  async function remove(all = false) {
    if (all && !window.confirm("Delete all notifications from your inbox? This only clears your own notifications.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteNotifications(all ? "all" : selectedIds);
      setSelected([]);
    } catch (cause) {
      setDeleteError(errorMessage(cause));
    } finally {
      setDeleting(false);
    }
  }

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

  if (feed && !feed.enabled) return null;

  const preferences = feed?.preferences;
  const available = feed?.available;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-brand-50"
      >
        <FiBell className="size-[21px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-brand-deep ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-[80px] z-50 flex max-h-[calc(100dvh-96px)] animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[min(36rem,calc(100dvh-120px))]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold text-ink">Notifications</h2>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button type="button" onClick={() => void markRead("all")} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-50">
                  Mark all as read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-cream" aria-label="Close notifications">
                <FiX className="size-4" />
              </button>
            </div>
          </div>

          {items.length > 0 && <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2 text-xs">
            <label className="flex min-h-9 items-center gap-2 font-medium text-ink">
              <input type="checkbox" className="size-4 accent-brand" checked={allSelected} ref={(node) => { if (node) node.indeterminate = selectedIds.length > 0 && !allSelected; }} disabled={deleting} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} />
              Select all shown
            </label>
            <button type="button" disabled={deleting || selectedIds.length === 0} onClick={() => void remove()} className="min-h-9 font-semibold text-danger disabled:opacity-40">Delete selected ({selectedIds.length})</button>
            <button type="button" disabled={deleting} onClick={() => void remove(true)} className="min-h-9 font-semibold text-danger disabled:opacity-40">Delete all</button>
          </div>}
          {deleteError && <p role="alert" className="px-4 py-2 text-xs text-danger">{deleteError}</p>}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {!feed && !error && <p className="px-3 py-8 text-center text-sm text-muted">Loading…</p>}
            {!feed && error && <p className="px-3 py-8 text-center text-sm text-muted">Notifications couldn&apos;t be loaded. We&apos;ll try again shortly.</p>}
            {feed && feed.items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <FiBell className="mx-auto size-7 text-brand/40" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-muted">Order updates, new arrivals and store news will appear here.</p>
              </div>
            )}
            {feed && feed.items.length > 0 && (
              <ul className="space-y-1">
                {feed.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-1">
                    <label className="flex min-h-11 shrink-0 items-center px-2">
                      <input type="checkbox" className="size-4 accent-brand" aria-label={`Select ${item.title}`} checked={selectedIds.includes(item.id)} disabled={deleting} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                    </label>
                    <NotificationItem
                      item={item}
                      onOpen={() => {
                        if (!item.read) void markRead([item.id]);
                        if (item.targetUrl) setOpen(false);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          <p className="sr-only" role="status" aria-live="polite">{unread} unread notifications</p>

          <div className="shrink-0 space-y-3 border-t border-line bg-cream/60 px-4 py-3">
            {preferences && available && (available.newProducts || available.promotions) && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">I&apos;d like to hear about</p>
                {available.newProducts && (
                  <Toggle label="New products" checked={preferences.newProducts} onChange={(checked) => void setPreferences({ ...preferences, newProducts: checked })} />
                )}
                {available.promotions && (
                  <Toggle
                    label="Offers and promotions"
                    description="Only sent if you switch this on."
                    checked={preferences.promotions}
                    onChange={(checked) => void setPreferences({ ...preferences, promotions: checked })}
                  />
                )}
              </div>
            )}
            <PushControls storeName={storeName} />
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
