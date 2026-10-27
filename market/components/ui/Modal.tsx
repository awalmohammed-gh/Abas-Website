"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/hooks/useScrollLock";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Prevents closing while a request is running. */
  locked?: boolean;
}

const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

/**
 * Dialog built on the native <dialog> element: focus is trapped, Escape closes
 * it and the page behind is inert. Becomes a bottom sheet on small screens.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md", locked = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useScrollLock(open);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !locked) onClose();
      }}
      className={cn(
        "z-50 m-0 mt-auto max-h-dvh w-full max-w-none overflow-y-auto overscroll-contain bg-transparent p-0 backdrop:bg-brand-deep/45 backdrop:backdrop-blur-[2px]",
        "sm:m-auto sm:w-[calc(100%_-_2rem)]",
        widths[size],
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] min-w-0 animate-pop-in flex-col rounded-t-2xl bg-white shadow-pop sm:max-h-[85dvh] sm:rounded-2xl">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              className="-mr-2 shrink-0 rounded-lg p-2 text-muted hover:bg-brand-50 hover:text-ink disabled:opacity-40"
              aria-label="Close dialog"
            >
              <FiX className="size-5" />
            </button>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
