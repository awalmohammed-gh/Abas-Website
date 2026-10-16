"use client";

import { FaWhatsapp } from "react-icons/fa";
import { FiInfo } from "react-icons/fi";
import { formatGHS } from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface CartSummaryProps {
  itemCount: number;
  subtotal: number;
  checking: boolean;
  blockedReason: string | null;
  onCheckout: () => void;
  onClear: () => void;
}

export function CartSummary({ itemCount, subtotal, checking, blockedReason, onCheckout, onClear }: CartSummaryProps) {
  return (
    <aside className="h-fit space-y-5 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-24" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="text-lg font-semibold text-ink">
        Order summary
      </h2>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Items</dt>
          <dd className="font-medium text-ink">{itemCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="font-medium text-ink">{formatGHS(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Delivery</dt>
          <dd className="text-right text-muted">Confirmed on WhatsApp</dd>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3 text-base">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            {checking && <Spinner className="text-muted" label="Checking prices" />}
            {formatGHS(subtotal)}
          </dd>
        </div>
      </dl>

      <Button
        variant="whatsapp"
        size="lg"
        className="w-full"
        onClick={onCheckout}
        disabled={!!blockedReason || itemCount === 0}
        leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}
      >
        Order via WhatsApp
      </Button>
      {blockedReason && <p className="text-center text-xs font-medium text-danger">{blockedReason}</p>}

      <p className="flex gap-2 rounded-xl bg-cream p-3 text-xs leading-relaxed text-muted">
        <FiInfo className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        No payment is taken on this website. We confirm availability, delivery and payment with you on WhatsApp.
      </p>

      <button type="button" onClick={onClear} className="w-full text-center text-sm font-medium text-muted hover:text-danger">
        Clear cart
      </button>
    </aside>
  );
}
