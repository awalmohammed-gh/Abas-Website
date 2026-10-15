"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiCheckCircle, FiCopy, FiShoppingBag } from "react-icons/fi";
import { formatGHS, type CartQuote, type QuoteLine } from "@aba-mart/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/hooks/useCart";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { cartLineKey } from "@/types/cart";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { saveLastOrder, useLastOrder, type LastOrder } from "./lastOrderStore";
import { WhatsAppCheckout } from "./WhatsAppCheckout";

function OrderSent({ order }: { order: LastOrder }) {
  const [copied, setCopied] = useState(false);

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
        <ButtonLink href={order.whatsappUrl} external variant="whatsapp" size="lg" leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}>
          Open WhatsApp
        </ButtonLink>
        <Button variant="secondary" size="lg" onClick={copy} leftIcon={<FiCopy className="size-4" aria-hidden="true" />}>
          {copied ? "Copied" : "Copy order message"}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => saveLastOrder(null)}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        WhatsApp didn&apos;t open? Use the button above, or copy the message and send it to us on WhatsApp.
      </p>
    </section>
  );
}

export function CartView({ whatsappEnabled }: { whatsappEnabled: boolean }) {
  const { lines, hydrated, itemCount, subtotal, clear, applyQuote } = useCart();
  const lastOrder = useLastOrder();
  const searchParams = useSearchParams();
  const [checkoutOpen, setCheckoutOpen] = useState(() => searchParams.get("checkout") === "1");
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Re-price the cart from the server whenever its contents change.
  const signature = lines.map((l) => `${l.key}x${l.quantity}`).join("|");
  const debouncedSignature = useDebounce(signature, 350);

  useEffect(() => {
    if (!hydrated || !debouncedSignature) return;
    const controller = new AbortController();
    const items = lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));
    Promise.resolve()
      .then(() => setChecking(true))
      .then(() => api.post<CartQuote>("/orders/quote", { items }))
      .then((result) => {
        if (controller.signal.aborted) return;
        setQuote(result);
        applyQuote(result);
      })
      .catch(() => {
        // Keep the saved prices; the server re-checks everything at checkout anyway.
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
    // lines are captured through the debounced signature
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSignature, hydrated, applyQuote]);

  const issues = useMemo(() => {
    const map = new Map<string, QuoteLine>();
    for (const line of quote?.lines ?? []) {
      if (line.status !== "ok") map.set(cartLineKey(line.productId, line.variantId), line);
    }
    return map;
  }, [quote]);

  const blockingIssue = lines.some((l) => {
    const issue = issues.get(l.key);
    return issue && issue.status !== "quantity_adjusted";
  });
  const blockedReason = !whatsappEnabled
    ? "WhatsApp ordering is being set up. Please check back soon."
    : blockingIssue
      ? "Some items are unavailable. Remove them to continue."
      : null;

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]" aria-hidden="true">
        <div className="skeleton h-64" />
        <div className="skeleton h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
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
              if (window.confirm("Remove all items from your cart?")) clear();
            }}
          />
        </div>
      )}

      <WhatsAppCheckout
        open={checkoutOpen && lines.length > 0 && !blockedReason}
        onClose={() => setCheckoutOpen(false)}
        expectedTotal={subtotal}
        onCartChanged={(updated, message) => {
          setQuote(updated);
          applyQuote(updated);
          setNotice(`${message} We've updated your cart — please review it before sending.`);
        }}
      />
    </div>
  );
}
