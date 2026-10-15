import type { Metadata } from "next";
import { Suspense } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiClock, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { formatPhoneDisplay } from "@aba-mart/shared";
import { getSettings } from "@/lib/catalog";
import { whatsappChatUrl } from "@/lib/whatsapp";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with ABA Mart on WhatsApp, phone or email.",
  alternates: { canonical: "/contact" },
};

async function ContactDetails() {
  const settings = await getSettings();
  const chatUrl = whatsappChatUrl(settings.whatsappNumber);
  const items = [
    chatUrl && { icon: FaWhatsapp, label: "WhatsApp", value: formatPhoneDisplay(settings.whatsappNumber), href: chatUrl, external: true },
    settings.supportPhone && { icon: FiPhone, label: "Phone", value: settings.supportPhone, href: `tel:${settings.supportPhone.replace(/[^\d+]/g, "")}` },
    settings.supportEmail && { icon: FiMail, label: "Email", value: settings.supportEmail, href: `mailto:${settings.supportEmail}` },
    settings.address && { icon: FiMapPin, label: "Location", value: settings.address },
    settings.openingHours && { icon: FiClock, label: "Business hours", value: settings.openingHours },
  ].filter(Boolean) as { icon: typeof FiPhone; label: string; value: string; href?: string; external?: boolean }[];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ul className="space-y-3">
        {items.length === 0 && (
          <li className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">Contact details will be published here shortly.</li>
        )}
        {items.map(({ icon: Icon, label, value, href, external }) => (
          <li key={label} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
              {href ? (
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="break-words font-semibold text-ink hover:text-brand"
                >
                  {value}
                </a>
              ) : (
                <p className="whitespace-pre-line font-medium text-ink">{value}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {settings.whatsappNumber ? (
        <ContactForm whatsappNumber={settings.whatsappNumber} storeName={settings.storeName} />
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-muted">
          Our WhatsApp line is being set up. Please use the phone or email details for now.
        </div>
      )}
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <header className="mb-8 max-w-2xl">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Contact</p>
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">We&apos;re here to help</h1>
        <p className="mt-3 text-lg text-muted">Questions about a product, delivery or your order? Reach us the way that suits you.</p>
      </header>
      <Suspense fallback={<div className="skeleton h-80" />}>
        <ContactDetails />
      </Suspense>
    </div>
  );
}
