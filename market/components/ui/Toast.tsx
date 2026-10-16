"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiLoader, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

/**
 * The site's toaster: short pop-up messages in the corner of the screen.
 *
 *   toast.success("Banner deleted");
 *   toast.error("Could not save", { title: "Upload failed" });
 *   toast.info("Saved as draft", { action: { label: "Undo", onClick: undo } });
 *   const id = toast.loading("Uploading…"); toast.success("Uploaded", { id });
 *   await toast.promise(save(), { loading: "Saving…", success: "Saved", error: (e) => errorMessage(e) });
 *
 * `toast` works anywhere on the client (no provider needed); <Toaster /> in the root
 * layout renders it. For "are you sure?" questions use confirm() from ConfirmDialog.
 */

export type ToastTone = "success" | "error" | "info" | "warning" | "loading";

export interface ToastOptions {
  /** Bold first line; the message becomes the supporting text. */
  title?: string;
  /** Milliseconds before it closes. Errors stay 7 s, others 4 s; loading toasts stay until replaced. Use Infinity to keep it open. */
  duration?: number;
  /** One button, e.g. "Undo". Clicking it runs onClick and closes the toast. */
  action?: { label: string; onClick: () => void };
  /** Reuse an id to replace an existing toast in place (e.g. loading → success). */
  id?: string;
}

interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
  title?: string;
  action?: ToastOptions["action"];
  duration: number;
  /** Changes on every update, so the close timer restarts. */
  version: number;
  closing: boolean;
}

const DURATION: Record<ToastTone, number> = { success: 4000, info: 4000, warning: 6000, error: 7000, loading: Infinity };
const MAX_VISIBLE = 4;
const EXIT_MS = 180;

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const EMPTY: ToastItem[] = [];

function emit(next: ToastItem[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function show(tone: ToastTone, message: string, options: ToastOptions = {}): string {
  const id = options.id ?? `toast-${++counter}`;
  const item: ToastItem = {
    id,
    tone,
    message,
    title: options.title,
    action: options.action,
    duration: options.duration ?? DURATION[tone],
    version: ++counter,
    closing: false,
  };
  emit(toasts.some((t) => t.id === id) ? toasts.map((t) => (t.id === id ? item : t)) : [...toasts, item].slice(-MAX_VISIBLE));
  return id;
}

/** Closes one toast (with its exit animation), or all of them when no id is given. */
function dismiss(id?: string) {
  const closing = toasts.filter((t) => (id === undefined || t.id === id) && !t.closing);
  if (!closing.length) return;
  const ids = new Set(closing.map((t) => t.id));
  emit(toasts.map((t) => (ids.has(t.id) ? { ...t, closing: true } : t)));
  window.setTimeout(() => emit(toasts.filter((t) => !(ids.has(t.id) && t.closing))), EXIT_MS);
}

type Message<T> = string | ((value: T) => string);
const resolveMessage = <T,>(message: Message<T>, value: T) => (typeof message === "function" ? message(value) : message);

/** Shows a loading toast while `work` runs, then replaces it with the success or error message. Rethrows errors. */
async function promise<T>(
  work: Promise<T> | (() => Promise<T>),
  messages: { loading: string; success: Message<T>; error: Message<unknown> },
  options: Omit<ToastOptions, "id"> = {},
): Promise<T> {
  const id = show("loading", messages.loading, options);
  try {
    const value = await (typeof work === "function" ? work() : work);
    show("success", resolveMessage(messages.success, value), { ...options, id });
    return value;
  } catch (error) {
    show("error", resolveMessage(messages.error, error), { ...options, id });
    throw error;
  }
}

export const toast = {
  success: (message: string, options?: ToastOptions) => show("success", message, options),
  error: (message: string, options?: ToastOptions) => show("error", message, options),
  info: (message: string, options?: ToastOptions) => show("info", message, options),
  warning: (message: string, options?: ToastOptions) => show("warning", message, options),
  loading: (message: string, options?: ToastOptions) => show("loading", message, options),
  promise,
  dismiss,
};

export type ToastApi = typeof toast;

/** Hook form of `toast`, kept for components that already call useToast(). */
export function useToast(): ToastApi {
  return toast;
}

const TONES: Record<ToastTone, { icon: ReactNode; border: string }> = {
  success: { icon: <FiCheckCircle className="size-5 text-success" aria-hidden="true" />, border: "border-success/30" },
  error: { icon: <FiAlertCircle className="size-5 text-danger" aria-hidden="true" />, border: "border-danger/30" },
  warning: { icon: <FiAlertTriangle className="size-5 text-accent-700" aria-hidden="true" />, border: "border-accent/40" },
  info: { icon: <FiInfo className="size-5 text-brand" aria-hidden="true" />, border: "border-brand/20" },
  loading: { icon: <FiLoader className="size-5 animate-spin text-brand" aria-hidden="true" />, border: "border-line" },
};

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

function ToastCard({ item }: { item: ToastItem }) {
  const [hovered, setHovered] = useState(false);
  const pageHidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const remaining = useRef(item.duration);

  // An updated toast (same id, new content) gets its full time again.
  useEffect(() => {
    remaining.current = item.duration;
  }, [item.version, item.duration]);

  // Counts down only while the toast is visible and not hovered or focused.
  useEffect(() => {
    if (hovered || pageHidden || item.closing || !Number.isFinite(remaining.current)) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [hovered, pageHidden, item.closing, item.id, item.version]);

  const tone = TONES[item.tone];
  const urgent = item.tone === "error" || item.tone === "warning";

  return (
    <div
      role={urgent ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-pop",
        tone.border,
        item.closing ? "animate-toast-out" : "animate-pop-in",
      )}
    >
      <span className="mt-0.5 shrink-0">{tone.icon}</span>
      <div className="min-w-0 flex-1">
        {item.title && <p className="font-semibold text-ink">{item.title}</p>}
        <p className={cn("break-words", item.title ? "mt-0.5 text-muted" : "text-ink")}>{item.message}</p>
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              dismiss(item.id);
            }}
            className="mt-2 rounded-md text-sm font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {item.action.label}
          </button>
        )}
      </div>
      {item.tone !== "loading" && (
        <button type="button" onClick={() => dismiss(item.id)} className="-m-1 shrink-0 rounded-md p-1 text-muted hover:bg-brand-50 hover:text-ink" aria-label="Dismiss notification">
          <FiX className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Renders the toasts. Mounted once in the root layout. It lives in the browser's top layer
 * (a manual popover), so toasts stay visible above open dialogs such as forms and confirm().
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list || typeof list.showPopover !== "function" || !items.length) return;
    // Re-showing moves the toaster above any dialog that opened after it.
    if (list.matches(":popover-open")) {
      if (!document.querySelector("dialog:modal")) return;
      list.hidePopover();
    }
    list.showPopover();
  }, [items]);

  return (
    <div
      ref={ref}
      popover="manual"
      role="region"
      aria-label="Messages"
      className="pointer-events-none fixed inset-x-0 top-auto bottom-4 z-[70] m-0 flex h-auto w-auto max-w-none flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 px-4 sm:bottom-6 sm:items-end sm:px-6"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
