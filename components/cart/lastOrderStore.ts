"use client";

import { useSyncExternalStore } from "react";
import { GUEST_CHANGED_EVENT } from "@/lib/guest-api";

/** Temporary handoff panel. Persistent retries come from the private server order history. */
export interface LastOrder {
  id: string;
  orderReference: string;
  total: number;
  itemCount: number;
  whatsappUrl: string;
  message: string;
  previewUrl: string;
}

const listeners = new Set<() => void>();
let current: LastOrder | null = null;
export function saveLastOrder(order: LastOrder | null): void {
  current = order;
  listeners.forEach((listener) => listener());
}
const clear = () => saveLastOrder(null);
export function useLastOrder(): LastOrder | null {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    window.addEventListener(GUEST_CHANGED_EVENT, clear);
    return () => {
      listeners.delete(listener);
      window.removeEventListener(GUEST_CHANGED_EVENT, clear);
    };
  }, () => current, () => null);
}
