"use client";

import { useSyncExternalStore } from "react";

/** The order just sent to WhatsApp, kept for this browser tab so the customer can reopen or copy it. */
export interface LastOrder {
  orderReference: string;
  total: number;
  itemCount: number;
  whatsappUrl: string;
  message: string;
}

const KEY = "aba-mart:last-order";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: LastOrder | null = null;

function read(): LastOrder | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as LastOrder) : null;
    cachedValue =
      parsed && typeof parsed.orderReference === "string" && typeof parsed.whatsappUrl === "string" && parsed.whatsappUrl.startsWith("https://wa.me/")
        ? parsed
        : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

export function saveLastOrder(order: LastOrder | null): void {
  try {
    if (order) window.sessionStorage.setItem(KEY, JSON.stringify(order));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // sessionStorage unavailable: the success panel still shows until the page changes.
  }
  listeners.forEach((l) => l());
}

export function useLastOrder(): LastOrder | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => null,
  );
}
