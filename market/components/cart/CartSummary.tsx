"use client";

import { FiCheck, FiShield, FiShoppingCart } from "react-icons/fi";
import { formatGHS, type QuoteLine } from "@aba-mart/shared";
import { ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useCart } from "@/hooks/useCart";
import { CartItem } from "./CartItem";

interface CartSummaryProps {
  itemCount: number;
  subtotal: number;
  checking: boolean;
  issues: Map<string, QuoteLine>;
  locked: boolean;
  onClear: () => void;
}

export function CartSummary({ itemCount, subtotal, checking, issues, locked, onClear }: CartSummaryProps) {
  const { lines } = useCart();
  return <aside className="checkout-panel checkout-summary" aria-labelledby="summary-heading">
    <header className="checkout-panel-header"><FiShoppingCart className="size-8 shrink-0" aria-hidden="true" /><h2 id="summary-heading">Your Order</h2>{itemCount > 0 && <span className="checkout-count">{itemCount} item{itemCount === 1 ? "" : "s"}</span>}</header>
    <div className="checkout-summary-body">
      {lines.length ? <ul className="divide-y divide-[#dce2f1]">{lines.map(line => <CartItem key={line.key} line={line} issue={issues.get(line.key)} locked={locked} />)}</ul> : <div className="py-8 text-center"><FiShoppingCart className="mx-auto mb-3 size-10 text-brand/40" aria-hidden="true" /><p className="text-sm font-semibold">Your cart is empty</p><p className="mt-1 text-xs text-muted">Find something you love to get started.</p><ButtonLink href="/shop" size="sm" className="mt-4">Continue shopping</ButtonLink></div>}
      <dl className="checkout-totals"><div><dt>Subtotal</dt><dd>{formatGHS(subtotal)}</dd></div><div><dt>Shipping</dt><dd className="text-right text-xs font-medium text-muted">Confirmed on WhatsApp</dd></div><div className="checkout-total"><dt>Total</dt><dd aria-live="polite">{checking && <Spinner className="text-brand" label="Updating total" />}{formatGHS(subtotal)}</dd></div></dl>
      <div className="checkout-confidence"><span className="checkout-shield" aria-hidden="true"><FiShield /><FiCheck /></span><div><h3>Shop with Confidence</h3><p>Secure ordering &middot; Friendly support</p></div></div>
      {lines.length > 0 && <div className="mt-4 flex items-center justify-between gap-3 text-xs"><ButtonLink href="/shop" variant="link">Continue shopping</ButtonLink><button type="button" disabled={checking || locked} onClick={onClear} className="min-h-11 text-muted hover:text-danger disabled:opacity-50">Clear cart</button></div>}
    </div>
  </aside>;
}
