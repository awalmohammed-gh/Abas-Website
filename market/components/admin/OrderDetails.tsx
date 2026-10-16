"use client";

import Image from "next/image";
import { useState } from "react";
import { broadcastStoreEvent } from "@/lib/storeChannel";
import { FaWhatsapp } from "react-icons/fa";
import { FiPhone } from "react-icons/fi";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_TRANSITIONS,
  STOCK_DEDUCTING_STATUSES,
  buildWhatsAppUrl,
  formatGHS,
  formatPhoneDisplay,
  normalizePhoneNumber,
  type OrderDTO,
  type OrderStatus,
} from "@aba-mart/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "./AdminUI";
import { confirm } from "@/components/ui/ConfirmDialog";

function stockEffect(order: OrderDTO, next: OrderStatus): string | null {
  if (STOCK_DEDUCTING_STATUSES.includes(next) && !order.inventoryAdjusted) return "Stock for these items will be deducted now.";
  if (next === "Cancelled" && order.inventoryAdjusted) return "The deducted stock will be returned to inventory.";
  if (next === "Cancelled") return "Stock was never deducted for this order, so inventory won't change.";
  return null;
}

interface OrderDetailsProps {
  order: OrderDTO;
  storeName: string;
  onClose: () => void;
  onUpdated: (order: OrderDTO) => void;
}

export function OrderDetails({ order, storeName, onClose, onUpdated }: OrderDetailsProps) {
  const toast = useToast();
  // Suggest the step that matches how the customer receives the order.
  const skip: OrderStatus = order.fulfillmentMethod === "delivery" ? "Ready for Pickup" : "Out for Delivery";
  const options = [...ORDER_STATUS_TRANSITIONS[order.status]].sort((a, b) => Number(a === skip) - Number(b === skip));
  const [next, setNext] = useState<OrderStatus | "">(options[0] ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const phone = normalizePhoneNumber(order.customer.phone);
  const chatUrl = phone
    ? buildWhatsAppUrl(phone, `Hello ${order.customer.name}, this is ${storeName} about your order ${order.orderReference}.`)
    : null;

  async function updateStatus() {
    if (!next) return;
    if (next === "Cancelled" && !(await confirm({ title: `Cancel order ${order.orderReference}?`, description: "The order will be marked as Cancelled.", confirmLabel: "Cancel order", cancelLabel: "Keep order", tone: "danger" }))) return;
    setSaving(true);
    try {
      const result = await api.patch<{ order: OrderDTO; changed: boolean }>(`/admin/orders/${order.id}/status`, { status: next, note });
      toast.success(result.changed ? `${order.orderReference} is now ${result.order.status}` : "No change — the order already had that status.");
      setNote("");
      setNext([...ORDER_STATUS_TRANSITIONS[result.order.status]].sort((a, b) => Number(a === skip) - Number(b === skip))[0] ?? "");
      onUpdated(result.order);
      if (result.changed) broadcastStoreEvent({ type: "notifications" });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const effect = next ? stockEffect(order, next) : null;

  return (
    <Modal open onClose={onClose} locked={saving} size="lg" title={`Order ${order.orderReference}`} description={`Placed ${formatDateTime(order.createdAt)} via WhatsApp`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-muted">
            {order.inventoryAdjusted ? "Stock deducted for this order" : "Stock not deducted"}
          </span>
        </div>

        <section className="grid gap-4 sm:grid-cols-2" aria-label="Customer">
          <div className="space-y-1 rounded-xl bg-cream p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Customer</p>
            <p className="font-semibold text-ink">{order.customer.name}</p>
            <p className="text-sm text-ink">{formatPhoneDisplay(order.customer.phone)}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {chatUrl && (
                <ButtonLink href={chatUrl} external size="sm" variant="whatsapp" leftIcon={<FaWhatsapp className="size-4" aria-hidden="true" />}>
                  WhatsApp customer
                </ButtonLink>
              )}
              <ButtonLink href={`tel:+${order.customer.phone}`} external={false} size="sm" variant="secondary" leftIcon={<FiPhone className="size-4" aria-hidden="true" />}>
                Call
              </ButtonLink>
            </div>
          </div>
          <div className="space-y-1 rounded-xl bg-cream p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{FULFILLMENT_LABELS[order.fulfillmentMethod]}</p>
            {order.fulfillmentMethod === "delivery" ? (
              <>
                <p className="font-semibold text-ink">{order.deliveryLocation}</p>
                {order.deliveryAddress && <p className="whitespace-pre-line text-sm text-ink">{order.deliveryAddress}</p>}
              </>
            ) : (
              <p className="text-sm text-ink">Customer will collect from the store.</p>
            )}
            {order.notes && (
              <p className="pt-2 text-sm text-muted">
                <span className="font-semibold text-ink">Notes: </span>
                {order.notes}
              </p>
            )}
          </div>
        </section>

        <section aria-label="Items">
          <ul className="divide-y divide-line rounded-xl border border-line">
            {order.items.map((item, index) => (
              <li key={`${item.productId}-${item.variantId ?? index}`} className="flex items-center gap-3 p-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-cream-200">
                  <Image src={item.image || "/images/placeholders/product.svg"} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                  {item.attributes.length > 0 && <p className="text-xs text-muted">{item.attributes.map((a) => `${a.name}: ${a.value}`).join(" · ")}</p>}
                  <p className="text-xs text-muted">
                    {item.quantity} × {formatGHS(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-ink">{formatGHS(item.lineTotal)}</p>
              </li>
            ))}
            <li className="flex items-center justify-between p-3 text-base">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-display font-bold text-ink">{formatGHS(order.total)}</span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted">Prices are a snapshot from when the order was placed.</p>
        </section>

        {options.length > 0 ? (
          <section className="space-y-3 rounded-xl border border-line p-4" aria-label="Update status">
            <p className="text-sm font-semibold text-ink">Update status</p>
            <div className="grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)]">
              <select
                aria-label="New status"
                value={next}
                onChange={(e) => setNext(e.target.value as OrderStatus)}
                className="h-11 rounded-xl border border-line bg-white px-3 text-sm"
              >
                {options.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                aria-label="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="Note (optional), e.g. Confirmed by phone"
                className="h-11 rounded-xl border border-line px-3 text-sm"
              />
            </div>
            {effect && <p className="text-xs text-muted">{effect}</p>}
            <Button onClick={updateStatus} loading={saving} disabled={!next}>
              Mark as {next}
            </Button>
          </section>
        ) : (
          <p className="rounded-xl bg-cream p-4 text-sm text-muted">This order is {order.status.toLowerCase()} and can no longer change.</p>
        )}

        <section aria-label="History">
          <p className="mb-2 text-sm font-semibold text-ink">History</p>
          <ol className="space-y-2 border-l-2 border-line pl-4">
            {[...order.statusHistory].reverse().map((entry, index) => (
              <li key={`${entry.changedAt}-${index}`} className="text-sm">
                <span className="font-medium text-ink">{entry.status}</span>
                <span className="text-muted"> · {formatDateTime(entry.changedAt)}</span>
                {entry.note && <p className="text-xs text-muted">{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Modal>
  );
}
