import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderList } from "@/components/orders/OrderList";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

export default function MyOrdersPage() {
  return <div className="container-page py-8 sm:py-12">
    <header className="mb-8"><h1 className="text-3xl font-bold sm:text-4xl">My orders</h1><p className="mt-2 max-w-2xl text-muted">Track your private order requests and continue the conversation with us on WhatsApp.</p></header>
    <Suspense fallback={<div className="skeleton h-64" aria-label="Loading your orders" />}><OrderList /></Suspense>
  </div>;
}
