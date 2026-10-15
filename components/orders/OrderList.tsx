"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiPackage, FiRefreshCw } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { formatGHS, formatPhoneDisplay, type CustomerOrderDTO, type Paginated } from "@aba-mart/shared";
import { ProductImage } from "@/components/products/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/api";
import { ensureGuestSession, GUEST_CHANGED_EVENT, guestApi } from "@/lib/guest-api";
import { initiateOrderHandoff } from "@/lib/order-handoff";
import { GuestPrivacy } from "./GuestPrivacy";

function OrderItems({ order }: { order: CustomerOrderDTO }) {
  return <ul className="divide-y divide-line">
    {order.items.map((item, index) => <li key={`${item.productId}:${item.variantId}:${index}`} className="flex gap-3 py-4">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream"><ProductImage src={item.image} alt={item.name} sizes="64px" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{item.name}</p>
        {item.attributes.length > 0 && <p className="text-xs text-muted">{item.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ")}</p>}
        <p className="mt-1 text-sm text-muted">Qty {item.quantity} · {formatGHS(item.unitPrice)} each</p>
      </div>
      <p className="text-sm font-semibold">{formatGHS(item.lineTotal)}</p>
    </li>)}
  </ul>;
}

function OrderActions({ order, onDetails }: { order: CustomerOrderDTO; onDetails?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function resume() {
    if (!order.whatsappUrl) return;
    setBusy(true);
    setError(null);
    try {
      if (!await initiateOrderHandoff(order.id, order.whatsappUrl)) setError("Allow pop-ups and try again. Your cart is still saved.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return <div>
    <div className="flex flex-wrap gap-2">
      {onDetails && <Button variant="secondary" onClick={onDetails}>View details</Button>}
      <ButtonLink href={order.previewUrl} external variant="secondary">Product preview</ButtonLink>
      {order.whatsappUrl && <Button variant="whatsapp" loading={busy} onClick={resume} leftIcon={<FaWhatsapp aria-hidden="true" />}>Continue on WhatsApp</Button>}
      {order.contactUrl && <ButtonLink href={order.contactUrl} external variant="secondary">Contact ABA Mart</ButtonLink>}
    </div>
    {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
  </div>;
}

export function OrderList() {
  const [result, setResult] = useState<Paginated<CustomerOrderDTO> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerOrderDTO | null>(null);
  const [reload, setReload] = useState(0);
  const visit = useRef(0);
  const refresh = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await ensureGuestSession(true);
        const orders = await guestApi.get<Paginated<CustomerOrderDTO>>(`/my-orders?page=${page}`);
        if (active) setResult(orders);
      } catch (cause) {
        if (active) { setResult(null); setError(errorMessage(cause)); }
      } finally {
        if (active) setLoading(false);
      }
    }
    const onGuestChanged = () => { visit.current += 1; setSelected(null); setResult(null); setPage(1); refresh(); };
    window.addEventListener(GUEST_CHANGED_EVENT, onGuestChanged);
    window.addEventListener("focus", refresh);
    void load();
    return () => {
      active = false;
      window.removeEventListener(GUEST_CHANGED_EVENT, onGuestChanged);
      window.removeEventListener("focus", refresh);
    };
  }, [page, reload, refresh]);

  async function details(id: string) {
    const currentVisit = visit.current;
    try {
      const order = await guestApi.get<CustomerOrderDTO>(`/my-orders/${id}`);
      if (visit.current === currentVisit) setSelected(order);
    } catch (cause) { if (visit.current === currentVisit) setError(errorMessage(cause)); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">Orders for this guest visit · No account needed</p>
      <Button variant="secondary" size="sm" onClick={refresh} disabled={loading} leftIcon={<FiRefreshCw aria-hidden="true" />}>Refresh orders</Button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger">{error}</p>}
    {loading ? <div className="skeleton h-64" aria-label="Loading your orders" /> : result && !result.items.length ? <EmptyState icon={<FiPackage />} title="No orders in this visit yet" description="Your prepared WhatsApp orders will appear here. If you cleared cookies, use a private recovery code below to restore an earlier visit." action={<ButtonLink href="/shop">Browse the shop</ButtonLink>} /> :
      <div className="grid items-start gap-5 lg:grid-cols-2">{result?.items.map((order) => <article key={order.id} className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">{order.orderReference}</h2><p className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}</p></div>
          <Badge tone={order.status === "Completed" ? "success" : order.status === "Cancelled" ? "danger" : "brand"}>{order.status}</Badge>
        </div>
        <OrderItems order={order} />
        <div className="mb-4 flex items-center justify-between border-t border-line pt-4"><p className="text-sm text-muted">{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p><p className="text-xl font-bold">{formatGHS(order.total)}</p></div>
        {order.status === "WhatsApp Pending" && <p className="mb-4 rounded-xl bg-accent-50 p-3 text-sm leading-relaxed text-accent-700">Your WhatsApp order request has been prepared. ABA Mart will confirm your order after receiving your message.</p>}
        <OrderActions order={order} onDetails={() => void details(order.id)} />
      </article>)}</div>}
    {result && result.totalPages > 1 && <nav aria-label="Order history pages" className="flex items-center justify-center gap-4">
      <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
      <span className="text-sm">Page {page} of {result.totalPages}</span>
      <Button variant="secondary" disabled={page >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
    </nav>}
    <GuestPrivacy onChanged={() => { setSelected(null); setResult(null); setPage(1); refresh(); }} />
    <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.orderReference ?? "Order details"} description="Your saved order details" size="lg">
      {selected && <div className="space-y-5">
        <Badge tone="brand">{selected.status}</Badge>
        <OrderItems order={selected} />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Customer</dt><dd>{selected.customer.name}</dd></div>
          <div><dt className="text-muted">WhatsApp contact</dt><dd>{formatPhoneDisplay(selected.customer.phone)}</dd></div>
          <div><dt className="text-muted">Fulfillment</dt><dd>{selected.fulfillmentMethod === "pickup" ? "Pickup" : "Delivery"}</dd></div>
          {selected.fulfillmentMethod === "delivery" && <div><dt className="text-muted">Delivery location</dt><dd>{selected.deliveryLocation}<br />{selected.deliveryAddress}</dd></div>}
          {selected.notes && <div><dt className="text-muted">Your notes</dt><dd>{selected.notes}</dd></div>}
          <div><dt className="text-muted">Order total</dt><dd className="font-bold">{formatGHS(selected.total)}</dd></div>
        </dl>
        <OrderActions order={selected} />
      </div>}
    </Modal>
  </div>;
}
