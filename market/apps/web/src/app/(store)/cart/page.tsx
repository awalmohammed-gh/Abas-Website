import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/cart/CartView";
import { getSettings } from "@/lib/catalog";
import { whatsappOrderingNotice } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false, follow: false },
  alternates: { canonical: "/cart" },
};

async function CartLoader() {
  const settings = await getSettings();
  const notice = whatsappOrderingNotice(settings);
  return <CartView whatsappEnabled={!notice} whatsappNotice={notice} />;
}

export default function CartPage() {
  return (
    <div className="container-page py-8 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">Your cart</h1>
        <p className="mt-2 text-muted">Review your items, then send your order to us on WhatsApp. No account or online payment needed.</p>
      </header>
      <Suspense
        fallback={
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]" aria-hidden="true">
            <div className="skeleton h-64" />
            <div className="skeleton h-72" />
          </div>
        }
      >
        <CartLoader />
      </Suspense>
    </div>
  );
}
