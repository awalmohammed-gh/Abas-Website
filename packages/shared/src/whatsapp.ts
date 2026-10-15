import { FULFILLMENT_LABELS, type FulfillmentMethod } from "./constants.js";
import { formatGHS } from "./money.js";
import { formatPhoneDisplay } from "./phone.js";
import { cleanText } from "./text.js";
import type { VariantAttribute } from "./types.js";

export interface WhatsAppOrderMessageInput {
  storeName: string;
  orderReference: string;
  items: {
    name: string;
    attributes?: VariantAttribute[];
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  total: number;
  customer: { name: string; phone: string };
  fulfillmentMethod: FulfillmentMethod;
  deliveryLocation?: string;
  deliveryAddress?: string;
  notes?: string;
}

/**
 * Builds the plain-text order message the customer sends to the store on
 * WhatsApp. Every value comes from the order the API validated and saved.
 */
export function buildOrderMessage(input: WhatsAppOrderMessageInput): string {
  const lines: string[] = [];
  const storeName = cleanText(input.storeName) || "ABA Mart";

  lines.push(`Hello ${storeName},`, "");
  lines.push("I would like to order the following items:", "");
  lines.push(`Order Reference: ${input.orderReference}`, "");

  input.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${cleanText(item.name)}`);
    for (const attribute of item.attributes ?? []) {
      lines.push(`${cleanText(attribute.name)}: ${cleanText(attribute.value)}`);
    }
    lines.push(`Quantity: ${item.quantity}`);
    lines.push(`Unit Price: ${formatGHS(item.unitPrice)}`);
    lines.push(`Subtotal: ${formatGHS(item.lineTotal)}`, "");
  });

  lines.push(`Total: ${formatGHS(input.total)}`, "");
  lines.push(`Customer: ${cleanText(input.customer.name)}`, "");
  lines.push(`Phone: ${formatPhoneDisplay(input.customer.phone)}`, "");
  lines.push(`Delivery/Pickup: ${FULFILLMENT_LABELS[input.fulfillmentMethod]}`, "");

  const location = cleanText(input.deliveryLocation ?? "");
  if (input.fulfillmentMethod === "delivery" && location) {
    lines.push(`Location: ${location}`, "");
  }
  const address = cleanText(input.deliveryAddress ?? "", { multiline: true });
  if (input.fulfillmentMethod === "delivery" && address) {
    lines.push(`Address: ${address}`, "");
  }
  const notes = cleanText(input.notes ?? "", { multiline: true });
  if (notes) {
    lines.push(`Additional Notes: ${notes}`, "");
  }

  lines.push(
    input.fulfillmentMethod === "pickup"
      ? "Please confirm availability and pickup arrangements."
      : "Please confirm availability and delivery arrangements.",
    "",
  );
  lines.push("Thank you.");

  return lines.join("\n");
}

/**
 * WhatsApp click-to-chat link: https://wa.me/<number>?text=<encoded message>.
 * The number must be international digits without "+", spaces or dashes.
 */
export function buildWhatsAppUrl(phoneDigits: string, text?: string): string {
  const digits = phoneDigits.replace(/\D/g, "");
  if (!digits) throw new Error("A WhatsApp number is required to build a click-to-chat link.");
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
