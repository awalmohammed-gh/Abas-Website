"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiCheckCircle, FiCopy, FiShoppingBag } from "react-icons/fi";
import { formatGHS, type QuoteLine } from "@aba-mart/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/hooks/useCart";
import { errorMessage } from "@/lib/api";
import { initiateOrderHandoff } from "@/lib/order-handoff";
import { cartLineKey } from "@/types/cart";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { saveLastOrder, useLastOrder, type LastOrder } from "./lastOrderStore";
import { WhatsAppCheckout } from "./WhatsAppCheckout";

function OrderSent({ order }: { order: LastOrder }) {
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueOrder() {
    setOpening(true);
    setError(null);
    try {
      if (!await initiateOrderHandoff(order.id, order.whatsappUrl)) setError("Allow pop-ups, then try Open WhatsApp again. Your cart is still saved.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setOpening(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(order.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl border border-success/30 bg-white p-5 shadow-card sm:p-7" aria-labelledby="order-ready-heading">
      <div className="flex items-start gap-3">
        <FiCheckCircle className="mt-1 size-6 shrink-0 text-success" aria-hidden="true" />
        <div className="space-y-1">
          <h2 id="order-ready-heading" className="text-xl font-bold text-ink">
            Order {order.orderReference} is ready to send
          </h2>
          <p className="text-sm text-muted">
            {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · {formatGHS(order.total)}. Your order reaches us once you press{" "}
            <strong>send</strong> in WhatsApp. We&apos;ll reply to confirm availability, delivery and payment.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={continueOrder} loading={opening} variant="whatsapp" size="lg" leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}>
          Open WhatsApp
        </Button>
        <Button variant="secondary" size="lg" onClick={copy} leftIcon={<FiCopy className="size-4" aria-hidden="true" />}>
          {copied ? "Copied" : "Copy order message"}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => saveLastOrder(null)}>
          Done
        </Button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-4">
        <ButtonLink href="/my-orders" variant="link">View your private order history</ButtonLink>
        <ButtonLink href={order.previewUrl} external variant="link">View products with images</ButtonLink>
      </div>
      <p className="mt-3 text-xs text-muted">
        WhatsApp didn&apos;t open? Use the button above, or copy the message and send it to us on WhatsApp.
      </p>
    </section>
  );
}

export function CartView({ whatsappEnabled, whatsappNotice }: { whatsappEnabled: boolean; whatsappNotice?: string | null }) {
  const { lines, hydrated, itemCount, subtotal, clear, applyQuote, quote, pending: checking, error, refresh } = useCart();
  const lastOrder = useLastOrder();
  const searchParams = useSearchParams();
  const [checkoutOpen, setCheckoutOpen] = useState(() => searchParams.get("checkout") === "1");
  const [notice, setNotice] = useState<string | null>(null);

  const issues = useMemo(() => {
    const map = new Map<string, QuoteLine>();
    for (const line of quote?.lines ?? []) {
      if (line.status !== "ok") map.set(cartLineKey(line.productId, line.variantId), line);
    }
    return map;
  }, [quote]);

  const blockingIssue = lines.some((l) => {
    const issue = issues.get(l.key);
    return !!issue;
  });
  const blockedReason = error ? "Refresh your cart before continuing." : !whatsappEnabled
    ? whatsappNotice ?? "WhatsApp ordering is being set up. Please check back soon."
    : blockingIssue
      ? "Adjust the quantities or remove unavailable items to continue."
      : null;

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]" aria-hidden="true">
        <div className="skeleton h-64" />
        <div className="skeleton h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>Your cart is private to this browser visit.</p>
        <ButtonLink href="/my-orders" variant="link">My orders &amp; guest privacy</ButtonLink>
      </div>
      {error && <div role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger">{error} <Button variant="link" onClick={() => void refresh()}>Retry</Button></div>}
      {lastOrder && <OrderSent order={lastOrder} />}

      {notice && (
        <p className="rounded-xl border border-accent/40 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700" role="status">
          {notice}
        </p>
      )}

      {lines.length === 0 ? (
        !lastOrder && (
          <EmptyState
            icon={<FiShoppingBag />}
            title="Your cart is empty"
            description="Browse the store and add the items you'd like. You can send the whole order to us on WhatsApp in one go."
            action={<ButtonLink href="/shop">Start shopping</ButtonLink>}
          />
        )
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section aria-labelledby="cart-items-heading" className="rounded-2xl border border-line bg-white px-4 sm:px-6">
            <h2 id="cart-items-heading" className="sr-only">
              Items in your cart
            </h2>
            <ul className="divide-y divide-line">
              {lines.map((line) => (
                <CartItem key={line.key} line={line} issue={issues.get(line.key)} />
              ))}
            </ul>
          </section>
          <CartSummary
            itemCount={itemCount}
            subtotal={subtotal}
            checking={checking}
            blockedReason={blockedReason}
            onCheckout={() => {
              setNotice(null);
              setCheckoutOpen(true);
            }}
            onClear={() => {
              if (window.confirm("Remove all items from your cart?")) void clear().catch(() => undefined);
            }}
          />
        </div>
      )}

      <WhatsAppCheckout
        open={checkoutOpen && lines.length > 0 && !blockedReason}
        onClose={() => setCheckoutOpen(false)}
        expectedTotal={subtotal}
        onCartChanged={(updated, message) => {
          applyQuote(updated);
          setNotice(`${message} Please review your cart before sending.`);
        }}
      />
    </div>
  );
}
