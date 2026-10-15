import type { Metadata } from "next";
import { Suspense } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { Benefits } from "@/components/home/Benefits";
import { ButtonLink } from "@/components/ui/Button";
import { getSettings } from "@/lib/catalog";
import { whatsappChatUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "About us",
  description: "ABA Mart is a Ghanaian multi-category store for everyday essentials. Learn how ordering on WhatsApp works.",
  alternates: { canonical: "/about" },
};

const STEPS = [
  { title: "Browse and add to cart", text: "Pick the products you want. Choose sizes, colours or volumes where they apply." },
  { title: "Add your details", text: "Tell us your name, phone number and whether you'd like delivery or pickup." },
  { title: "Send on WhatsApp", text: "WhatsApp opens with your full order written out, including an order reference. Tap send." },
  { title: "We confirm with you", text: "Our team replies to confirm availability, delivery or pickup, and how you'd like to pay." },
];

async function AboutIntro() {
  const settings = await getSettings();
  return (
    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
      {settings.storeDescription ||
        `${settings.storeName} brings everyday essentials together in one friendly store — from bathing soaps, shower gels and skincare to clothing and household products.`}
    </p>
  );
}

async function AboutCta() {
  const settings = await getSettings();
  const chatUrl = whatsappChatUrl(settings.whatsappNumber, `Hello ${settings.storeName}!`);
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <ButtonLink href="/shop" size="lg" rightIcon={<FiArrowRight className="size-5" aria-hidden="true" />}>
        Start shopping
      </ButtonLink>
      {chatUrl && (
        <ButtonLink href={chatUrl} external size="lg" variant="secondary" leftIcon={<FaWhatsapp className="size-5 text-whatsapp" aria-hidden="true" />}>
          Say hello on WhatsApp
        </ButtonLink>
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="container-page py-12 sm:py-16">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">About us</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl">Everyday essentials, with a personal touch.</h1>
        <Suspense fallback={<div className="skeleton mt-4 h-16 max-w-2xl" />}>
          <AboutIntro />
        </Suspense>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-line bg-white py-14 sm:py-16" aria-labelledby="how-heading">
        <div className="container-page">
          <h2 id="how-heading" className="text-2xl font-bold text-ink sm:text-3xl">
            How ordering works
          </h2>
          <p className="mt-2 max-w-2xl text-muted">No account, no card details and no app downloads. Just the WhatsApp you already use.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-line bg-cream p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand font-display text-lg font-bold text-cream">{index + 1}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Benefits />

      <section className="container-page py-14">
        <Suspense fallback={null}>
          <AboutCta />
        </Suspense>
      </section>
    </>
  );
}
