"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiBell, FiCheckCircle, FiX } from "react-icons/fi";
import { useNotifications } from "@/contexts/NotificationsContext";
import { isInviteSnoozed, snoozeInvite, visitElapsedMs } from "@/lib/push";

/** Pages where an invitation would interrupt the customer. */
const QUIET_PATHS = ["/cart", "/my-orders"];

/**
 * ABA Mart's own invitation to receive alerts. The browser's permission prompt
 * appears only after the visitor clicks "Enable notifications". It shows once
 * the visitor has browsed for a while, never on checkout pages, and not again
 * for two weeks after "Not now". A blocked permission is never asked again.
 */
export function PushPrompt({ storeName }: { storeName: string }) {
  const pathname = usePathname();
  const { feed, push, enablePush } = useNotifications();
  const [due, setDue] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);

  const delayMs = (feed?.promptDelaySeconds ?? 30) * 1000;
  const eligible =
    push.available &&
    push.support === "supported" &&
    push.permission === "default" &&
    !push.subscribed &&
    !QUIET_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!eligible || isInviteSnoozed()) return;
    const timer = window.setTimeout(() => setDue(true), Math.max(0, delayMs - visitElapsedMs()));
    return () => window.clearTimeout(timer);
  }, [eligible, delayMs]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDismissed(true), 3500);
    return () => window.clearTimeout(timer);
  }, [done]);

  if (dismissed || (!done && (!due || !eligible))) return null;

  const notNow = () => {
    snoozeInvite();
    setDismissed(true);
  };

  const enable = async () => {
    const ok = await enablePush();
    if (ok) setDone(true);
    // Denied or failed: close without asking again (a denied permission stays denied).
    else setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="push-invite-title"
      aria-describedby="push-invite-text"
      className="fixed inset-x-3 bottom-3 z-50 animate-pop-in rounded-2xl border border-brand/15 bg-white p-4 shadow-pop sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[23rem]"
    >
      {done ? (
        <p className="flex items-center gap-3 text-sm font-medium text-ink" role="status">
          <FiCheckCircle className="size-5 shrink-0 text-success" aria-hidden="true" /> You&apos;ll now get alerts from {storeName}.
        </p>
      ) : (
        <>
          <button type="button" onClick={notNow} className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-cream" aria-label="Close">
            <FiX className="size-4" />
          </button>
          <div className="flex gap-3 pr-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-accent" aria-hidden="true">
              <FiBell className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 id="push-invite-title" className="font-display text-base font-semibold text-ink">
                Stay in the loop with {storeName}
              </h2>
              <p id="push-invite-text" className="mt-1 text-sm leading-relaxed text-muted">
                Get a quick alert for new arrivals and store news. Offers only if you choose them. Turn alerts off any time.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void enable()}
              disabled={push.busy}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
            >
              Enable Notifications
            </button>
            <button
              type="button"
              onClick={notNow}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-cream"
            >
              Not Now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
