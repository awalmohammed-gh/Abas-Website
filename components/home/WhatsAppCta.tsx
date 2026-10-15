import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { formatPhoneDisplay } from "@aba-mart/shared";
import { ButtonLink } from "@/components/ui/Button";
import { getSettings } from "@/lib/catalog";
import { whatsappChatUrl } from "@/lib/whatsapp";

export async function WhatsAppCta() {
  const settings = await getSettings();
  const chatUrl = whatsappChatUrl(settings.whatsappNumber, `Hello ${settings.storeName}, I'm looking for a product. Can you help?`);

  return (
    <section className="container-page py-14 sm:py-16" aria-labelledby="whatsapp-cta-heading">
      <div className="relative overflow-hidden rounded-3xl bg-brand px-6 py-10 text-cream sm:px-12 sm:py-14">
        <FaWhatsapp className="pointer-events-none absolute -right-8 -top-8 size-56 text-white/[0.06]" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <h2 id="whatsapp-cta-heading" className="text-2xl font-bold sm:text-3xl">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mt-3 text-cream/80">
            Send us a message and a real person from {settings.storeName} will help you find it, check availability or arrange your delivery.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            {chatUrl ? (
              <ButtonLink href={chatUrl} external size="lg" variant="accent" leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}>
                Chat on WhatsApp
              </ButtonLink>
            ) : (
              <ButtonLink href="/contact" size="lg" variant="accent" rightIcon={<FiArrowRight className="size-5" aria-hidden="true" />}>
                Contact us
              </ButtonLink>
            )}
            {settings.whatsappNumber && <span className="text-sm text-cream/70">{formatPhoneDisplay(settings.whatsappNumber)}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
