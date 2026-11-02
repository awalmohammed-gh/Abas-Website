import type { Metadata } from "next";
import Image from "next/image";
import { FiHeadphones, FiShield, FiSmile, FiTruck } from "react-icons/fi";
import { Suspense } from "react";
import { CartView } from "@/components/cart/CartView";
import { getSettings } from "@/lib/catalog";
import { whatsappOrderingNotice } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Checkout",
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
    <div className="container-page checkout-page">
      <header className="checkout-hero">
        <div className="checkout-hero-copy"><h1>Checkout<span aria-hidden="true" className="checkout-spark">&#10022;</span></h1><p>Order via <strong>WhatsApp</strong> &ndash; Quick, Easy and Convenient!</p></div>
        <div className="checkout-hero-image"><Image src="/images/home/checkout-cart-v1.webp" alt="Blue shopping trolley filled with yellow shopping bags" fill preload sizes="(min-width: 1024px) 620px, 100vw" className="object-cover" /></div>
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
      <section className="checkout-benefits" aria-label="Shopping benefits">{[
        {icon:FiTruck,title:"Fast Delivery",text:"Delivery arranged with you"},
        {icon:FiShield,title:"Secure Shopping",text:"Your data is protected"},
        {icon:FiHeadphones,title:"Reliable Support",text:"We're here to help"},
        {icon:FiSmile,title:"Great Prices",text:"Shop more, save more"},
      ].map(({icon:Icon,title,text}) => <div key={title}><Icon aria-hidden="true" /><div><h2>{title}</h2><p>{text}</p></div></div>)}</section>
    </div>
  );
}
