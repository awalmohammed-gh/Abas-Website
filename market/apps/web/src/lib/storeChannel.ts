"use client";

/**
 * Same-browser messages between open tabs (admin and storefront). Other
 * devices pick up the same changes through polling.
 */
export type StoreEvent = { type: "settings" } | { type: "notifications" };

const CHANNEL = "aba-store";

export function broadcastStoreEvent(event: StoreEvent): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(event);
    channel.close();
  } catch {
    // Unsupported or blocked: polling still refreshes other tabs.
  }
}

export function onStoreEvent(listener: (event: StoreEvent) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (message: MessageEvent<StoreEvent>) => {
    if (message.data && typeof message.data === "object" && "type" in message.data) listener(message.data);
  };
  return () => channel.close();
}
