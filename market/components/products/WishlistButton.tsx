"use client";

import { useSyncExternalStore } from "react";
import { FiHeart } from "react-icons/fi";
import { toast } from "@/components/ui/Toast";

const KEY = "aba-mart:wishlist:v1";
const EVENT = "aba-mart:wishlist-change";
function snapshot() {
  try { return localStorage.getItem(KEY) || "[]"; } catch { return "[]"; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}
function readIds(raw: string): string[] {
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; }
}
export function WishlistButton({ id, name }: { id: string; name: string }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const saved = readIds(raw).includes(id);
  function toggle() {
    const ids = readIds(snapshot());
    const exists = ids.includes(id);
    try {
      localStorage.setItem(KEY, JSON.stringify(exists ? ids.filter(value => value !== id) : [...ids, id]));
      window.dispatchEvent(new Event(EVENT));
      toast.success(exists ? `${name} removed from your wishlist` : `${name} saved to your wishlist on this device`);
    } catch { toast.error("Your wishlist could not be saved on this device."); }
  }
  return <button type="button" onClick={toggle} aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} wishlist`} title="Wishlist saved on this device" className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full border border-line bg-white/95 text-brand shadow-sm transition-colors hover:bg-brand-50"><FiHeart className={`size-[18px] ${saved ? "fill-brand" : ""}`} aria-hidden="true" /></button>;
}
