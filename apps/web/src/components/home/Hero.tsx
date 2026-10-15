import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { ButtonLink } from "@/components/ui/Button";
import { getBanners, getSettings } from "@/lib/catalog";
import { whatsappChatUrl } from "@/lib/whatsapp";
import { HeroCarousel } from "./HeroCarousel";

const STEPS = [
  { title: "Browse", text: "Find what you need across every category." },
  { title: "Add to cart", text: "Pick sizes, colours and quantities." },
  { title: "Send on WhatsApp", text: "Your order is prepared — just tap send." },
];

/** Admin-managed banners when available; otherwise a branded introduction. */
export async function Hero() {
  const [banners, settings] = await Promise.all([getBanners(), getSettings()]);
  if (banners.length) return <HeroCarousel banners={banners} />;

  const chatUrl = whatsappChatUrl(settings.whatsappNumber, `Hello ${settings.storeName}, I'd like to place an order.`);
  return (
    <section className="relative overflow-hidden bg-brand-deep text-cream" aria-labelledby="hero-heading">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #FAF8F3 1px, transparent 0)", backgroundSize: "22px 22px" }}
        aria-hidden="true"
      />
      <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-accent">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" /> No account needed
          </p>
          <h1 id="hero-heading" className="text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Everyday essentials, ordered in minutes.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
            {settings.storeDescription ||
              "Soaps, shower gels, skincare, clothing and household favourites — add them to your cart and send your order straight to us on WhatsApp."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop" size="lg" variant="accent" rightIcon={<FiArrowRight className="size-5" aria-hidden="true" />}>
              Start shopping
            </ButtonLink>
            {chatUrl && (
              <ButtonLink
                href={chatUrl}
                external
                size="lg"
                className="border border-white/25 bg-white/5 text-cream hover:bg-white/15"
                leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}
              >
                Chat with us
              </ButtonLink>
            )}
          </div>
        </div>

        <ol className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 sm:p-6" aria-label="How ordering works">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-4 rounded-2xl bg-white/[0.06] p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-brand-deep">
                {index + 1}
              </span>
              <div>
                <p className="font-display font-semibold text-cream">{step.title}</p>
                <p className="text-sm text-cream/70">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return <div className="skeleton aspect-square w-full rounded-none sm:aspect-[16/7] lg:aspect-[8/3]" aria-hidden="true" />;
}
