"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  NOTIFICATION_POLL_MS,
  type NotificationFeedDTO,
  type NotificationPreferences,
  type PushConfigDTO,
} from "@aba-mart/shared";
import { usePolling } from "@/hooks/usePolling";
import { api, errorMessage } from "@/lib/api";
import { ensureGuestSession, GUEST_CHANGED_EVENT, guestApi } from "@/lib/guest-api";
import { getBrowserSubscription, getPermission, getPushSupport, subscribeBrowser, type PushSupport } from "@/lib/push";
import { broadcastStoreEvent, onStoreEvent } from "@/lib/storeChannel";

export interface PushState {
  support: PushSupport;
  permission: NotificationPermission | "unsupported";
  /** This browser has a push subscription saved with the store. */
  subscribed: boolean;
  /** The store has push configured and notifications switched on. */
  available: boolean;
  busy: boolean;
  error: string | null;
}

interface NotificationsValue {
  feed: NotificationFeedDTO | null;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (ids: string[] | "all") => Promise<void>;
  deleteNotifications: (ids: string[] | "all") => Promise<void>;
  setPreferences: (preferences: NotificationPreferences) => Promise<void>;
  push: PushState;
  /** Must be called directly from a click: it may show the browser's permission prompt. */
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return value;
}

const SYNC_KEY = "aba:push-synced";

/**
 * Storefront notifications: polls the MongoDB-backed feed about once a minute
 * while the tab is visible, keeps read state per guest session, and manages
 * this browser's Web Push subscription. The same poll reports the settings
 * version, so open tabs refresh after an admin changes store settings.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [feed, setFeed] = useState<NotificationFeedDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PushConfigDTO | null>(null);
  const [push, setPush] = useState<Omit<PushState, "available">>({
    support: "unsupported",
    permission: "unsupported",
    subscribed: false,
    busy: false,
    error: null,
  });
  const settingsVersion = useRef<string | null | undefined>(undefined);
  const visit = useRef(0);
  const loadSequence = useRef(0);

  const refresh = useCallback(async () => {
    const currentVisit = visit.current;
    const sequence = ++loadSequence.current;
    try {
      // The cart creates the guest session too; this reuses it so read state is per visitor.
      await ensureGuestSession().catch(() => undefined);
      const next = await api.get<NotificationFeedDTO>("/notifications/public");
      if (currentVisit !== visit.current || sequence !== loadSequence.current) return;
      setFeed(next);
      setError(null);
      if (settingsVersion.current !== undefined && next.settingsVersion !== settingsVersion.current) router.refresh();
      settingsVersion.current = next.settingsVersion;
    } catch (err) {
      if (currentVisit === visit.current && sequence === loadSequence.current) setError(errorMessage(err));
    }
  }, [router]);

  usePolling(refresh, NOTIFICATION_POLL_MS.customer);

  // Same-browser updates: admin saved settings, or another tab read notifications.
  useEffect(() => {
    const stop = onStoreEvent((event) => {
      if (event.type === "settings") router.refresh();
      void refresh();
    });
    const onGuestChanged = () => {
      visit.current += 1;
      setFeed(null);
      settingsVersion.current = undefined;
      try { sessionStorage.removeItem(SYNC_KEY); } catch { /* Storage can be blocked. */ }
      void refresh();
    };
    window.addEventListener(GUEST_CHANGED_EVENT, onGuestChanged);
    return () => {
      stop();
      window.removeEventListener(GUEST_CHANGED_EVENT, onGuestChanged);
    };
  }, [refresh, router]);

  // Detect push support and any existing subscription, without prompting.
  const enabled = feed?.enabled ?? false;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const support = getPushSupport();
      const permission = getPermission();
      const pushConfig = await api.get<PushConfigDTO>("/push/config").catch(() => null);
      let subscribed = false;
      if (support === "supported" && permission === "granted" && pushConfig?.enabled) {
        const subscription = await getBrowserSubscription().catch(() => null);
        if (subscription) {
          subscribed = true;
          // Once per tab session, re-link the subscription to the current guest session.
          try {
            if (!sessionStorage.getItem(SYNC_KEY)) {
              await guestApi.post("/push/subscribe", { subscription: subscription.toJSON() });
              sessionStorage.setItem(SYNC_KEY, "1");
            }
          } catch {
            // Keep the browser subscription; the next visit retries.
          }
        }
      }
      if (cancelled) return;
      setConfig(pushConfig);
      setPush((p) => ({ ...p, support, permission, subscribed }));
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const markRead = useCallback(
    async (ids: string[] | "all") => {
      setFeed((current) => {
        if (!current) return current;
        const items = current.items.map((item) => (ids === "all" || ids.includes(item.id) ? { ...item, read: true } : item));
        return { ...current, items, unreadCount: items.filter((i) => !i.read).length };
      });
      try {
        await guestApi.post("/notifications/read", ids === "all" ? { all: true } : { ids });
        broadcastStoreEvent({ type: "notifications" });
      } catch {
        void refresh();
      }
    },
    [refresh],
  );

  const setPreferences = useCallback(
    async (preferences: NotificationPreferences) => {
      setFeed((current) => (current ? { ...current, preferences } : current));
      try {
        await guestApi.put("/notifications/preferences", preferences);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const deleteNotifications = useCallback(async (ids: string[] | "all") => {
    const currentVisit = visit.current;
    await guestApi.post("/notifications/delete", ids === "all" ? { all: true } : { ids });
    if (currentVisit !== visit.current) return;
    loadSequence.current += 1;
    setFeed((current) => {
      if (!current) return current;
      const items = ids === "all" ? [] : current.items.filter((item) => !ids.includes(item.id));
      return { ...current, items, unreadCount: items.filter((item) => !item.read).length };
    });
    broadcastStoreEvent({ type: "notifications" });
    await refresh();
  }, [refresh]);

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (push.support !== "supported" || !config?.enabled || !config.publicKey) return false;
    // First await in the click handler, so browsers treat it as user-initiated.
    const permission = await Notification.requestPermission();
    setPush((p) => ({ ...p, permission, error: null }));
    if (permission !== "granted") return false;
    setPush((p) => ({ ...p, busy: true }));
    try {
      const subscription = await subscribeBrowser(config.publicKey);
      await guestApi.post("/push/subscribe", { subscription: subscription.toJSON(), preferences: feed?.preferences ?? undefined });
      try {
        sessionStorage.setItem(SYNC_KEY, "1");
      } catch {
        // ignore
      }
      setPush((p) => ({ ...p, subscribed: true, busy: false }));
      void refresh();
      return true;
    } catch (err) {
      // Browser-side failures (e.g. private windows, which can't receive push) arrive as DOMExceptions.
      const message = err instanceof DOMException
        ? "This browser couldn't turn on alerts. Private or incognito windows don't support them; try a normal window."
        : errorMessage(err);
      setPush((p) => ({ ...p, busy: false, error: message }));
      return false;
    }
  }, [config, feed?.preferences, push.support, refresh]);

  const disablePush = useCallback(async () => {
    setPush((p) => ({ ...p, busy: true, error: null }));
    try {
      const subscription = await getBrowserSubscription();
      if (subscription) {
        await guestApi.delete("/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setPush((p) => ({ ...p, subscribed: false, busy: false }));
      void refresh();
    } catch (err) {
      setPush((p) => ({ ...p, busy: false, error: errorMessage(err) }));
    }
  }, [refresh]);

  const value = useMemo<NotificationsValue>(
    () => ({
      feed,
      error,
      refresh,
      markRead,
      deleteNotifications,
      setPreferences,
      push: { ...push, available: !!config?.enabled && !!feed?.enabled },
      enablePush,
      disablePush,
    }),
    [feed, error, refresh, markRead, deleteNotifications, setPreferences, push, config, enablePush, disablePush],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
