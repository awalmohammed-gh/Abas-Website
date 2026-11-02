import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight, FiCheck, FiGrid, FiShoppingBag, FiTruck, FiUserCheck } from "react-icons/fi";
import { Benefits } from "@/components/home/Benefits";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
import { getCategories, getMetadataSettings, getSettings } from "@/lib/catalog";
import { storefrontCategories } from "@/lib/storefrontCategories";
import { supportChatUrl } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getMetadataSettings();
  return {
    title: "About us",
    description: `${storeName} is a Ghanaian multi-category store for everyday essentials. Learn how ordering on WhatsApp works.`,
    alternates: { canonical: "/about" },
  };
}

const STEPS = [
  { title: "Browse and add to cart", text: "Pick the products you want. Choose sizes, colours or volumes where they apply." },
  { title: "Add your details", text: "Tell us your name, phone number and whether you'd like delivery or pickup." },
  { title: "Send on WhatsApp", text: "WhatsApp opens with your full order written out, including an order reference. Tap send." },
  { title: "We confirm with you", text: "Our team replies to confirm availability, delivery or pickup, and how you'd like to pay." },
];

const HIGHLIGHTS = [
  { icon: FiUserCheck, text: "Shop as a guest, no account needed" },
  { icon: FaWhatsapp, text: "Order and get answers on WhatsApp" },
  { icon: FiTruck, text: "Choose delivery or pickup" },
];

async function AboutStory() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const collections = storefrontCategories(categories);
  const names = collections.map((c) => c.name);
  const range = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  const description = settings.storeDescription
    || `${settings.storeName} brings everyday essentials together in one friendly store${range ? `, from ${range}` : ""}.`;

  return (
    <div className="about-grid">
      <section className="about-story" aria-labelledby="story-heading">
        <h2 id="story-heading">Who We Are</h2>
        <p>{description}</p>
        <ul>
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text}><span><Icon aria-hidden="true" /></span>{text}</li>
          ))}
        </ul>
      </section>
      <aside className="checkout-panel" aria-labelledby="find-heading">
        <header className="checkout-panel-header">
          <FiShoppingBag className="size-8 shrink-0" aria-hidden="true" />
          <h2 id="find-heading">What You&apos;ll Find</h2>
        </header>
        <ul className="about-collections">
          {collections.map((category) => (
            <li key={category.slug}>
              <Link href={`/categories/${category.slug}`}>
                <FiCheck aria-hidden="true" />
                <span>{category.name}</span>
                <FiArrowRight aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <Link href="/shop" className="about-collections-all">
              <FiGrid aria-hidden="true" />
              <span>View all products</span>
              <FiArrowRight aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </aside>
    </div>
  );
}

async function AboutCta() {
  const settings = await getSettings();
  const chatUrl = supportChatUrl(settings, `Hello ${settings.storeName}!`);
  return (
    <section className="about-cta" aria-labelledby="cta-heading">
      <div>
        <h2 id="cta-heading">Ready to Start Shopping?</h2>
        <p>Find what you need, then send your order to us on WhatsApp.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/shop" variant="accent" size="lg" rightIcon={<FiArrowRight className="size-5" aria-hidden="true" />}>
          Start shopping
        </ButtonLink>
        {chatUrl && (
          <ButtonLink href={chatUrl} external size="lg" variant="whatsapp" leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}>
            Chat on WhatsApp
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

export default function AboutPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "About us", item: `${siteUrl}/about` },
    ],
  };

  return (
    <div className="container-page pt-2 pb-8 sm:pb-12">
      <JsonLd data={breadcrumbSchema} />
      <header className="shop-hero about-hero">
        <div className="shop-hero-copy">
          <h1>About Us</h1>
          <p>Everyday essentials, with a personal touch.</p>
        </div>
        <div className="shop-hero-image">
          <Image src="/images/home/aba-liquid-soap-v1.webp" alt="" fill preload sizes="(min-width: 1024px) 640px, 60vw" className="object-cover" />
        </div>
      </header>

      <Suspense fallback={<div className="skeleton h-72" />}>
        <AboutStory />
      </Suspense>

      <section id="how-it-works" className="about-steps scroll-mt-24" aria-labelledby="how-heading">
        <h2 id="how-heading">How Ordering Works</h2>
        <p>No account, no card details and no app downloads. Just the WhatsApp you already use.</p>
        <ol>
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="about-step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <Benefits />
      </div>

      <Suspense fallback={null}>
        <AboutCta />
      </Suspense>
    </div>
  );
}
