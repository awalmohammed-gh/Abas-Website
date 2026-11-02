"use client";

import { useRef, useState, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight, FiInfo, FiMapPin, FiShield, FiShoppingBag } from "react-icons/fi";
import {
  checkoutCustomerSchema,
  flattenIssues,
  type CartQuote,
  type FulfillmentMethod,
  type WhatsAppOrderResult,
} from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useCart } from "@/hooks/useCart";
import { ApiClientError } from "@/lib/api";
import { guestApi } from "@/lib/guest-api";
import { initiateOrderHandoff } from "@/lib/order-handoff";
import { reserveWhatsAppWindow } from "@/lib/whatsapp";
import { saveLastOrder } from "./lastOrderStore";

interface WhatsAppCheckoutProps {
  blockedReason: string | null;
  checking: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  expectedTotal: number;
  onCartChanged: (quote: CartQuote, message: string) => void;
}

interface FormState {
  name: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  deliveryLocation: string;
  deliveryAddress: string;
  notes: string;
  whatsappConfirmed: boolean;
}

const FULFILLMENT_OPTIONS = [
  { value: "delivery", label: "Delivery", hint: "We bring it to you", icon: FiMapPin },
  { value: "pickup", label: "Pickup", hint: "Collect from our shop", icon: FiShoppingBag },
] as const;

const EMPTY: FormState = { name: "", phone: "", fulfillmentMethod: "delivery", deliveryLocation: "", deliveryAddress: "", notes: "", whatsappConfirmed: false };

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function WhatsAppCheckout({ blockedReason, checking, expectedTotal, onCartChanged, onSubmittingChange }: WhatsAppCheckoutProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { lines } = useCart();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // One key per checkout attempt: retries after a network error can't create a duplicate order.
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (blockedReason || checking || submitting || lines.length === 0) return;
    setFormError(null);

    const parsed = checkoutCustomerSchema.safeParse(form);
    if (!parsed.success) {
      const fields = flattenIssues(parsed.error.issues);
      setErrors(fields);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    if (!form.whatsappConfirmed) {
      setErrors({ whatsappConfirmed: "Confirm that this number is registered on WhatsApp." });
      return;
    }

    // Reserve the tab now, while we're still inside the click: browsers block pop-ups opened after a request.
    const reserved = reserveWhatsAppWindow();
    setSubmitting(true);
    onSubmittingChange(true);

    try {
      const result = await guestApi.post<WhatsAppOrderResult>("/orders/whatsapp", {
        idempotencyKey,
        customer: parsed.data,
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        expectedTotal,
      });

      saveLastOrder({
        id: result.order.id,
        orderReference: result.order.orderReference,
        total: result.order.total,
        itemCount: result.order.items.reduce((sum, i) => sum + i.quantity, 0),
        whatsappUrl: result.whatsappUrl,
        message: result.message,
        previewUrl: result.previewUrl,
      });
      // A blocked window leaves the cart intact; the ready panel can retry this same order.
      try {
        await initiateOrderHandoff(result.order.id, result.whatsappUrl, reserved);
      } catch {
        // The prepared order remains in private history. Retrying its handoff is idempotent.
      }
      setForm(EMPTY);
      setIdempotencyKey(newKey());

    } catch (error) {
      reserved?.close();
      if (error instanceof ApiClientError) {
        const quote = (error.details as { quote?: CartQuote } | undefined)?.quote;
        if ((error.code === "CART_CHANGED" || error.code === "PRICE_CHANGED") && quote) {
          setIdempotencyKey(newKey());
          onCartChanged(quote, error.message);

          return;
        }
        if (error.code === "VALIDATION_ERROR") {
          const fields = Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k.replace(/^customer\./, ""), v]));
          setErrors(fields);
        }
        if (error.code === "IDEMPOTENCY_CONFLICT") setIdempotencyKey(newKey());
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
      onSubmittingChange(false);
    }
  }

  return (
    <section className="checkout-panel checkout-form-panel" aria-labelledby="checkout-form-heading">
      <header className="checkout-panel-header"><FaWhatsapp className="checkout-whatsapp-icon" aria-hidden="true" /><div><h2 id="checkout-form-heading">Place Your Order on WhatsApp</h2><p>Fill in your details, then send your order to us on WhatsApp.</p></div></header>
      <form ref={formRef} id="checkout-form" onSubmit={handleSubmit} noValidate className="checkout-form-body">
        {formError && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-medium text-danger" role="alert">{formError}</p>}
        <fieldset disabled={submitting} className="min-w-0 space-y-6">
          <div>
            <h3 className="checkout-step"><span>1</span>Your Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full Name" required autoComplete="name" placeholder="Enter your full name" value={form.name} onChange={event => update("name", event.target.value)} error={errors.name} maxLength={80} />
              <Input label="Phone Number" required type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 0271234567" value={form.phone} onChange={event => update("phone", event.target.value)} error={errors.phone} maxLength={25} />
            </div>
          </div>
          <div>
            <h3 className="checkout-step"><span>2</span>Delivery or Pickup</h3>
            <fieldset>
              <legend className="sr-only">How would you like to receive your order?</legend>
              <div className="grid grid-cols-2 gap-3">
                {FULFILLMENT_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
                  <label key={value} className="checkout-option">
                    <input type="radio" name="fulfillmentMethod" value={value} checked={form.fulfillmentMethod === value} onChange={() => update("fulfillmentMethod", value as FulfillmentMethod)} className="sr-only" />
                    <Icon aria-hidden="true" />
                    <span><strong>{label}</strong><small>{hint}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            {form.fulfillmentMethod === "delivery" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label="Delivery area or town" required autoComplete="address-level2" placeholder="e.g. East Legon, Accra" value={form.deliveryLocation} onChange={event => update("deliveryLocation", event.target.value)} error={errors.deliveryLocation} maxLength={120} />
                <Input label="Address or landmark (optional)" autoComplete="street-address" placeholder="e.g. Near the Shell station" value={form.deliveryAddress} onChange={event => update("deliveryAddress", event.target.value)} error={errors.deliveryAddress} maxLength={300} />
              </div>
            ) : (
              <p className="checkout-information mt-4"><FiInfo aria-hidden="true" /><span>We&apos;ll share our pickup location and opening times with you on WhatsApp.</span></p>
            )}
            <p className="mt-2 text-xs text-muted">Delivery fees and collection arrangements are confirmed with you on WhatsApp.</p>
          </div>
          <div>
            <h3 className="checkout-step"><span>3</span>Review &amp; Send</h3>
            <Textarea label="Additional Note (Optional)" rows={3} placeholder="Any special request? e.g. preferred delivery time..." value={form.notes} onChange={event => update("notes", event.target.value)} error={errors.notes} maxLength={500} />
            <label className="checkout-confirm"><input type="checkbox" checked={form.whatsappConfirmed} onChange={event => update("whatsappConfirmed", event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-brand" />This phone number is registered on WhatsApp and can be used to contact me about my order.</label>
            {errors.whatsappConfirmed && <p role="alert" className="mb-2 text-xs text-danger">{errors.whatsappConfirmed}</p>}
            <Button type="submit" variant="whatsapp" loading={submitting} disabled={!!blockedReason || checking || lines.length === 0} className="checkout-send-button" leftIcon={<FaWhatsapp aria-hidden="true" />} rightIcon={<FiArrowRight aria-hidden="true" />}>Send Order on WhatsApp</Button>
            {blockedReason && <p role="alert" className="mt-3 text-sm text-danger">{blockedReason}</p>}
            {!lines.length && <p className="mt-2 text-center text-xs text-muted">Add an item to your cart to prepare your order.</p>}
            <p className="checkout-security"><FiShield aria-hidden="true" /><span>Your information is safe and secure.</span></p>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">WhatsApp opens with your order ready. Review it and tap send to share it with our team.</p>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
