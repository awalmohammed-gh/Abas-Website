import { formatGHS, type ImageAsset, type OrderPreviewDTO } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { ProductImage } from "@/components/products/ProductImage";
import { ButtonLink } from "@/components/ui/Button";

const date = (value: string) => new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" }).format(new Date(value));

/** The shared view accepts a product-only DTO, never a private customer order. */
export function OrderPreview({ order, logo = null }: { order: OrderPreviewDTO; logo?: ImageAsset | null }) {
  return <article className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
    <header className="flex flex-wrap items-center justify-between gap-5 border-b border-line px-5 py-6 sm:px-8">
      <Logo storeName={order.storeName} logo={logo} />
      <div className="text-right">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Order preview</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{order.orderReference}</h1>
        <p className="mt-1 text-xs text-muted">Prepared {date(order.createdAt)}</p>
      </div>
    </header>
    <div className="px-5 py-6 sm:px-8">
      <p className="mb-2 text-sm leading-relaxed text-muted">Review the products and prices in this order request. Availability, delivery and payment arrangements are confirmed with {order.storeName} on WhatsApp.</p>
      <ul className="divide-y divide-line">
        {order.items.map((item, index) => <li key={index} className="grid gap-4 py-6 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-6">
          <div className="relative aspect-square w-28 overflow-hidden rounded-2xl border border-line bg-cream sm:w-32">
            <ProductImage src={item.image} alt={item.name} sizes="128px" className="object-contain" priority={index === 0} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">{item.name}</h2>
            {item.attributes.length > 0 && <p className="mt-1 text-sm text-muted">{item.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ")}</p>}
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-muted">Quantity</dt><dd className="mt-1 font-semibold">{item.quantity}</dd></div>
              <div><dt className="text-muted">Unit price</dt><dd className="mt-1 font-semibold">{formatGHS(item.unitPrice)}</dd></div>
              <div className="text-right"><dt className="text-muted">Subtotal</dt><dd className="mt-1 font-semibold">{formatGHS(item.lineTotal)}</dd></div>
            </dl>
          </div>
        </li>)}
      </ul>
    </div>
    <footer className="space-y-5 bg-brand-50 px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between gap-4"><p className="font-semibold text-brand">Grand total</p><p className="text-3xl font-bold text-brand-deep">{formatGHS(order.total)}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand/10 pt-4">
        <p className="max-w-md text-xs leading-relaxed text-muted">This shared preview contains products and totals only. It expires {date(order.expiresAt)}. This is an order request, not a payment receipt.</p>
        <ButtonLink href="/shop" variant="secondary" size="sm">Browse the shop</ButtonLink>
      </div>
    </footer>
  </article>;
}
