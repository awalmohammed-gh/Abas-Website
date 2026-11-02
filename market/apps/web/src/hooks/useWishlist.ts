"use client";

import { useSyncExternalStore } from "react";

/** Saved product IDs live on this device only, newest last; no account is needed. */
const KEY = "aba-mart:wishlist:v1";
const EVENT = "aba-mart:wishlist-change";
/** Matches the API's limit for one lookup. */
export const WISHLIST_LIMIT = 48;

function snapshot(): string {
  try {
    return localStorage.getItem(KEY) || "[]";
  } catch {
    return "[]";
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function readIds(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && /^[a-f\d]{24}$/i.test(id)) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

/** The saved IDs as a string, so React compares snapshots by value. Empty during server rendering. */
export function useWishlistIds(): string[] {
  return readIds(useSyncExternalStore(subscribe, snapshot, () => "[]"));
}

/** Adds or removes a product; returns whether it is now saved. Throws when storage is unavailable. */
export function toggleWishlist(id: string): boolean {
  const ids = readIds(snapshot());
  if (ids.includes(id)) {
    write(ids.filter((value) => value !== id));
    return false;
  }
  // The oldest saves drop off once the list is full.
  write([...ids, id].slice(-WISHLIST_LIMIT));
  return true;
}

export function clearWishlist(): void {
  write([]);
}
