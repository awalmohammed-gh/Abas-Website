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
    image?: string | null;
  }[];
  total: number;
  customer: { name: string; phone: string };
  fulfillmentMethod: FulfillmentMethod;
  deliveryLocation?: string;
  deliveryAddress?: string;
  notes?: string;
  previewUrl?: string;
  /** Opening line set by the store, e.g. "Good day ABA Mart,". Defaults to "Hello <store name>,". */
  greeting?: string;
}

/**
 * Builds the plain-text order message the customer sends to the store on
 * WhatsApp. Every value comes from the order the API validated and saved.
 */
export function buildOrderMessage(input: WhatsAppOrderMessageInput): string {
  const lines: string[] = [];
  const storeName = cleanText(input.storeName) || "ABA Mart";

  lines.push(cleanText(input.greeting ?? "") || `Hello ${storeName},`, "");
  lines.push("I would like to place an order.", "");
  lines.push(`Order Reference: ${input.orderReference}`, "");
  lines.push("Products:", "");

  input.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${cleanText(item.name)}`);
    for (const attribute of item.attributes ?? []) {
      lines.push(`${cleanText(attribute.name)}: ${cleanText(attribute.value)}`);
    }
    lines.push(`Quantity: ${item.quantity}`);
    lines.push(`Unit Price: ${formatGHS(item.unitPrice)}`);
    lines.push(`Subtotal: ${formatGHS(item.lineTotal)}`);
    const image = cloudinaryImageUrl(item.image);
    if (image) lines.push(`Image: ${image}`);
    lines.push("");
  });

  lines.push(`Total: ${formatGHS(input.total)}`, "");
  lines.push(`Customer Name: ${cleanText(input.customer.name)}`);
  lines.push(`Phone: ${formatPhoneDisplay(input.customer.phone)}`);
  lines.push(`Delivery Method: ${FULFILLMENT_LABELS[input.fulfillmentMethod]}`);

  const location = cleanText(input.deliveryLocation ?? "");
  if (input.fulfillmentMethod === "delivery" && location) {
    lines.push(`Location: ${location}`);
  }
  const address = cleanText(input.deliveryAddress ?? "", { multiline: true });
  if (input.fulfillmentMethod === "delivery" && address) {
    lines.push(`Address: ${address}`);
  }
  const notes = cleanText(input.notes ?? "", { multiline: true });
  if (notes) {
    lines.push(`Notes: ${notes}`);
  }

  if (input.previewUrl) lines.push("", "View all products with images:", input.previewUrl);
  lines.push("", "Please confirm availability and delivery arrangements.", "", "Thank you.");

  return lines.join("\n");
}

/** Only actual HTTPS Cloudinary image links belong in product order messages. */
export function cloudinaryImageUrl(value: string | null | undefined): string | null {
  if (!value || /[\r\n]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password &&
      /^\/[^/]+\/image\/upload\/.+/.test(url.pathname) ? url.href : null;
  } catch {
    return null;
  }
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
