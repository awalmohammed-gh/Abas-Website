"use client";

import { FULFILLMENT_LABELS, formatGHS, formatPhoneDisplay, type OrderDTO } from "@aba-mart/shared";
import { formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "./AdminUI";

export function OrderTable({ orders, onOpen }: { orders: OrderDTO[]; onOpen: (order: OrderDTO) => void }) {
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <button type="button" onClick={() => onOpen(order)} className="w-full space-y-2 p-4 text-left hover:bg-cream/60">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{order.orderReference}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink">{order.customer.name}</span>
                <span className="font-semibold text-ink">{formatGHS(order.total)}</span>
              </div>
              <p className="text-xs text-muted">
                {formatDateTime(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · {FULFILLMENT_LABELS[order.fulfillmentMethod]}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-cream/60 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Order</th>
              <th scope="col" className="px-3 py-3 font-semibold">Customer</th>
              <th scope="col" className="px-3 py-3 font-semibold">Fulfilment</th>
              <th scope="col" className="px-3 py-3 font-semibold">Total</th>
              <th scope="col" className="px-3 py-3 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3 font-semibold">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="cursor-pointer hover:bg-cream/50" onClick={() => onOpen(order)}>
                <td className="px-5 py-3">
                  <button type="button" onClick={() => onOpen(order)} className="font-semibold text-brand hover:underline">
                    {order.orderReference}
                  </button>
                  <p className="text-xs text-muted">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium text-ink">{order.customer.name}</p>
                  <p className="text-xs text-muted">{formatPhoneDisplay(order.customer.phone)}</p>
                </td>
                <td className="px-3 py-3">
                  {FULFILLMENT_LABELS[order.fulfillmentMethod]}
                  {order.deliveryLocation && <p className="max-w-[180px] truncate text-xs text-muted">{order.deliveryLocation}</p>}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink">{formatGHS(order.total)}</td>
                <td className="px-3 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
