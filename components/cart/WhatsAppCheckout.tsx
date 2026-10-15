"use client";

import { useState, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiMapPin, FiShoppingBag } from "react-icons/fi";
import {
  checkoutCustomerSchema,
  flattenIssues,
  formatGHS,
  type CartQuote,
  type FulfillmentMethod,
  type WhatsAppOrderResult,
} from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useCart } from "@/hooks/useCart";
import { ApiClientError } from "@/lib/api";
import { guestApi } from "@/lib/guest-api";
import { initiateOrderHandoff } from "@/lib/order-handoff";
import { cn } from "@/lib/utils";
import { reserveWhatsAppWindow } from "@/lib/whatsapp";
import { saveLastOrder } from "./lastOrderStore";

interface WhatsAppCheckoutProps {
  open: boolean;
  onClose: () => void;
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

const EMPTY: FormState = { name: "", phone: "", fulfillmentMethod: "delivery", deliveryLocation: "", deliveryAddress: "", notes: "", whatsappConfirmed: false };

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function WhatsAppCheckout({ open, onClose, expectedTotal, onCartChanged }: WhatsAppCheckoutProps) {
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
    setFormError(null);

    const parsed = checkoutCustomerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error.issues));
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
      onClose();

    } catch (error) {
      reserved?.close();
      if (error instanceof ApiClientError) {
        const quote = (error.details as { quote?: CartQuote } | undefined)?.quote;
        if ((error.code === "CART_CHANGED" || error.code === "PRICE_CHANGED") && quote) {
          setIdempotencyKey(newKey());
          onCartChanged(quote, error.message);
          onClose();
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
    }
  }

  const methodOption = (value: FulfillmentMethod, label: string, hint: string, Icon: typeof FiMapPin) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
        form.fulfillmentMethod === value ? "border-brand bg-brand-50" : "border-line hover:border-brand/40",
      )}
    >
      <input
        type="radio"
        name="fulfillmentMethod"
        value={value}
        checked={form.fulfillmentMethod === value}
        onChange={() => update("fulfillmentMethod", value)}
        className="mt-1 accent-brand"
      />
      <span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Icon className="size-4 text-brand" aria-hidden="true" /> {label}
        </span>
        <span className="text-xs text-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={submitting}
      title="Your details"
      description="We'll add these to your WhatsApp order so we can confirm it with you."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Back to cart
          </Button>
          <Button
            type="submit"
            form="checkout-form"
            variant="whatsapp"
            loading={submitting}
            leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}
          >
            Continue to WhatsApp · {formatGHS(expectedTotal)}
          </Button>
        </>
      }
    >
      <form id="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger" role="alert">
            {formError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" required autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} error={errors.name} maxLength={80} />
          <Input
            label="WhatsApp phone number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="024 123 4567"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            error={errors.phone}
            maxLength={25}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.whatsappConfirmed} onChange={(event) => update("whatsappConfirmed", event.target.checked)} className="mt-1 accent-brand" />
          This number is registered on WhatsApp and can be used to contact me about my order.
        </label>
        {errors.whatsappConfirmed && <p role="alert" className="text-sm text-danger">{errors.whatsappConfirmed}</p>}

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">How would you like to receive your order?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {methodOption("delivery", "Delivery", "We'll confirm the delivery fee and time", FiMapPin)}
            {methodOption("pickup", "Pickup", "Collect from our store", FiShoppingBag)}
          </div>
        </fieldset>

        {form.fulfillmentMethod === "delivery" && (
          <div className="grid gap-4">
            <Input
              label="Delivery area or town"
              required
              autoComplete="address-level2"
              placeholder="e.g. East Legon, Accra"
              value={form.deliveryLocation}
              onChange={(e) => update("deliveryLocation", e.target.value)}
              error={errors.deliveryLocation}
              maxLength={120}
            />
            <Input
              label="Address or landmark"
              hint="Optional — helps our rider find you"
              autoComplete="street-address"
              value={form.deliveryAddress}
              onChange={(e) => update("deliveryAddress", e.target.value)}
              error={errors.deliveryAddress}
              maxLength={300}
            />
          </div>
        )}

        <Textarea
          label="Additional notes"
          hint="Optional"
          rows={3}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          error={errors.notes}
          maxLength={500}
        />
        <p className="text-xs text-muted">
          WhatsApp will open with your order, product image links and a product preview link. Review it and tap send. Photos are shared as links; your message is only sent when you send it.
        </p>
      </form>
    </Modal>
  );
}
