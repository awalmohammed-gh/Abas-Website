"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { FiAlertTriangle, FiHelpCircle } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Site-styled replacement for window.confirm():
 *
 *   if (!(await confirm({ title: "Delete this banner?", description: "This cannot be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
 *
 * Resolves true when confirmed and false when cancelled (Cancel, Escape, or clicking outside).
 * <ConfirmDialog /> in the root layout renders it. Focus starts on Cancel, so an
 * accidental Enter never confirms a destructive action.
 */

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** Defaults to "Delete" for danger and "Confirm" otherwise. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" shows a warning icon and a red confirm button. */
  tone?: "danger" | "default";
}

interface Request extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

let current: Request | null = null;
let mounted = 0;
const listeners = new Set<() => void>();

function setCurrent(next: Request | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  // Without a mounted <ConfirmDialog /> (should not happen), still ask the question.
  if (!mounted) {
    const text = typeof options.description === "string" ? `${options.title}\n\n${options.description}` : options.title;
    return Promise.resolve(window.confirm(text));
  }
  return new Promise((resolve) => {
    current?.resolve(false); // a newer question replaces an unanswered one
    setCurrent({ ...options, resolve });
  });
}

function answer(confirmed: boolean) {
  const request = current;
  setCurrent(null);
  request?.resolve(confirmed);
}

export function ConfirmDialog() {
  const request = useSyncExternalStore(subscribe, () => current, () => null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mounted += 1;
    return () => {
      mounted -= 1;
    };
  }, []);

  // Runs after the Modal has called showModal(), so it wins over the dialog's default focus.
  useEffect(() => {
    if (request) cancelRef.current?.focus();
  }, [request]);

  const danger = request?.tone === "danger";

  return (
    <Modal
      open={request !== null}
      onClose={() => answer(false)}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          {danger ? <FiAlertTriangle className="size-5 shrink-0 text-danger" aria-hidden="true" /> : <FiHelpCircle className="size-5 shrink-0 text-brand" aria-hidden="true" />}
          {request?.title}
        </span>
      }
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={() => answer(false)}>
            {request?.cancelLabel ?? "Cancel"}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => answer(true)}>
            {request?.confirmLabel ?? (danger ? "Delete" : "Confirm")}
          </Button>
        </>
      }
    >
      {request?.description ? <div className="text-sm leading-relaxed text-muted">{request.description}</div> : <span className="sr-only">{request?.title}</span>}
    </Modal>
  );
}
