"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { PushSubscriberStats, StoreSettingsDTO } from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from "@/components/admin/AdminUI";
import { NotificationComposer } from "@/components/admin/NotificationComposer";
import { NotificationManager, type NotificationScope } from "@/components/admin/NotificationManager";
import { PushSubscriberSummary } from "@/components/admin/PushSubscriberSummary";
import { useAdminResource } from "@/hooks/useAdminResource";

function NotificationsContent() {
  const params = useSearchParams();
  const scopeParam = params.get("scope");
  const initialScope: NotificationScope = scopeParam === "alerts" || scopeParam === "customer" ? scopeParam : "all";
  const settings = useAdminResource<StoreSettingsDTO>("/admin/settings");
  const stats = useAdminResource<PushSubscriberStats>("/admin/notifications/subscribers");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Order alerts for your team, and announcements for customers in the store's notification bell and as push alerts."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Publish an announcement">
          <div className="p-4 sm:p-5">
            {settings.loading && !settings.data ? (
              <LoadingBlock label="Loading" />
            ) : settings.error && !settings.data ? (
              <ErrorBlock message={settings.error} onRetry={settings.reload} />
            ) : settings.data ? (
              <NotificationComposer
                settings={settings.data.notifications}
                pushConfigured={stats.data?.configured ?? false}
                onSaved={() => {
                  setRefreshKey((k) => k + 1);
                  stats.reload();
                }}
              />
            ) : null}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Push subscribers">
            <div className="space-y-3 p-4 sm:p-5">
              <PushSubscriberSummary stats={stats.data} />
              <p className="text-xs leading-relaxed text-muted">
                Customers subscribe from the store&apos;s invitation or notification bell. Offers only go to customers who opted in.
              </p>
            </div>
          </Panel>
          <Panel title="Preferences">
            <div className="space-y-2 p-4 text-sm text-muted sm:p-5">
              <p>Switch notification types, order alerts and the invitation timing in Settings.</p>
              <Link href="/admin/settings?tab=notifications" className="font-semibold text-brand hover:underline">
                Open notification settings
              </Link>
            </div>
          </Panel>
        </div>
      </div>
      <Panel title="History" className="mt-6">
        <NotificationManager initialScope={initialScope} refreshKey={refreshKey} />
      </Panel>
    </>
  );
}

export function NotificationsView() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading notifications" />}>
      <NotificationsContent />
    </Suspense>
  );
}
