"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `callback` now and then every `intervalMs` while the page is visible.
 * Polling stops while the tab is hidden and runs immediately when it becomes
 * visible again, so background tabs make no requests.
 */
export function usePolling(callback: () => unknown, intervalMs: number, enabled = true): void {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    let stopped = false;

    const run = async () => {
      try {
        await saved.current();
      } catch {
        // Errors are reported by the callback's own state; keep polling.
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (document.hidden || stopped) return;
        await run();
        if (!stopped) schedule();
      }, intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
        return;
      }
      void run();
      schedule();
    };

    if (!document.hidden) void run();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
