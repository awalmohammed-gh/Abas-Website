"use client";

import type { PushSubscriberStats } from "@aba-mart/shared";

/** Counts of browsers subscribed to push alerts. No subscription details are shown or sent. */
export function PushSubscriberSummary({ stats }: { stats: PushSubscriberStats | null }) {
  if (!stats) return <div className="skeleton h-24" aria-hidden="true" />;
  if (!stats.configured) {
    return (
      <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
        Push alerts are off on the server: set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT in the API environment. In-app notifications still work.
      </p>
    );
  }
  const items = [
    { label: "Active subscribers", value: stats.active },
    { label: "Want new products", value: stats.newProducts },
    { label: "Opted in to offers", value: stats.promotions },
    { label: "Expired or turned off", value: stats.inactive },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-cream px-3 py-3">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-ink">{item.value.toLocaleString("en-GH")}</dd>
        </div>
      ))}
    </dl>
  );
}
