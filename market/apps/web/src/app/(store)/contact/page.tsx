import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight, FiClock, FiHelpCircle, FiMail, FiMapPin, FiPackage, FiPhone, FiShoppingBag } from "react-icons/fi";
import { formatPhoneDisplay } from "@aba-mart/shared";
import { getMetadataSettings, getSettings } from "@/lib/catalog";
import { supportChatUrl } from "@/lib/whatsapp";
import { ContactForm } from "@/components/contact/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getMetadataSettings();
  return {
    title: "Contact us",
    description: `Get in touch with ${storeName} on WhatsApp, phone or email.`,
    alternates: { canonical: "/contact" },
  };
}

/** Only facts the store already states elsewhere: guest checkout, WhatsApp confirmation, My orders. */
const FAQS = [
  { q: "How do I place an order?", a: "Add products to your cart, fill in your details at checkout and send the order to us on WhatsApp." },
  { q: "Do I need an account?", a: "No. You can shop and order without creating an account or paying online." },
  { q: "How do I pay?", a: "Pay on delivery or by Mobile Money. We confirm the payment details with you on WhatsApp." },
  { q: "How much is delivery?", a: "Delivery fees and timing depend on your area. We confirm them with you on WhatsApp before you pay." },
];

type Channel = { icon: typeof FiPhone; label: string; value: string; action?: string; href?: string; external?: boolean; tone?: "whatsapp" };

async function ContactDetails() {
  const settings = await getSettings();
  const chatUrl = supportChatUrl(settings);
  const channels = [
    chatUrl && { icon: FaWhatsapp, label: "WhatsApp", value: formatPhoneDisplay(settings.whatsappNumber), action: "Chat with us", href: chatUrl, external: true, tone: "whatsapp" },
    settings.supportPhone && { icon: FiPhone, label: "Phone", value: settings.supportPhone, action: "Call us", href: `tel:${settings.supportPhone.replace(/[^d+]/g, "")}` },
    settings.supportEmail && { icon: FiMail, label: "Email", value: settings.supportEmail, action: "Email us", href: `mailto:${settings.supportEmail}` },
    settings.address && { icon: FiMapPin, label: "Location", value: settings.address },
    settings.openingHours && { icon: FiClock, label: "Business hours", value: settings.openingHours },
  ].filter(Boolean) as Channel[];

  return (
    <>
      <section aria-labelledby="contact-channels-heading" className="mb-6">
        <h2 id="contact-channels-heading" className="sr-only">Ways to reach us</h2>
        {channels.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">Contact details will be published here shortly.</p>
        ) : (
          <ul className="contact-channels">
            {channels.map(({ icon: Icon, label, value, action, href, external, tone }) => {
              const body = (
                <>
                  <span className="contact-channel-icon"><Icon aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <small>{label}</small>
                    <strong className="whitespace-pre-line">{value}</strong>
                    {action && <span className="contact-channel-action">{action}<FiArrowRight aria-hidden="true" /></span>}
                  </span>
                </>
              );
              return (
                <li key={label}>
                  {href ? (
                    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`contact-channel${tone ? " contact-channel-whatsapp" : ""}`}>
                      {body}
                      {external && <span className="sr-only"> (opens in a new tab)</span>}
                    </a>
                  ) : (
                    <div className="contact-channel">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="contact-grid">
        {settings.whatsappNumber ? (
          <ContactForm whatsappNumber={settings.whatsappNumber} storeName={settings.storeName} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-muted">
            Our WhatsApp line is being set up. Please use the phone or email details for now.
          </div>
        )}
        <aside className="checkout-panel" aria-labelledby="contact-faq-heading">
          <header className="checkout-panel-header">
            <FiHelpCircle className="size-8 shrink-0" aria-hidden="true" />
            <h2 id="contact-faq-heading">Good to Know</h2>
          </header>
          <dl className="contact-faq">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
          <div className="contact-links">
            <Link href="/my-orders"><FiPackage aria-hidden="true" />Track my orders</Link>
            <Link href="/shop"><FiShoppingBag aria-hidden="true" />Browse products</Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function ContactPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Contact us", item: `${siteUrl}/contact` },
    ],
  };

  return (
    <div className="container-page pt-2 pb-8 sm:pb-12">
      <JsonLd data={breadcrumbSchema} />
      <header className="shop-hero contact-hero">
        <div className="shop-hero-copy">
          <h1>Contact Us</h1>
          <p>Questions about a product, delivery or your order? We&apos;re here to help.</p>
        </div>
        <div className="shop-hero-image">
          <Image src="/images/home/shopping-hero-v2.webp" alt="" fill preload sizes="(min-width: 1024px) 640px, 60vw" className="object-cover" />
        </div>
      </header>
      <Suspense fallback={<div className="skeleton h-80" />}>
        <ContactDetails />
      </Suspense>
    </div>
  );
}
