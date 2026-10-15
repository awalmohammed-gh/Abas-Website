import Link from "next/link";
import { cacheLife } from "next/cache";
import type { IconType } from "react-icons";
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { FiClock, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { formatPhoneDisplay, type SocialLinks } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { getCategories, getSettings } from "@/lib/catalog";
import { whatsappChatUrl } from "@/lib/whatsapp";

async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const SOCIAL: { key: keyof SocialLinks; label: string; icon: IconType }[] = [
  { key: "facebook", label: "Facebook", icon: FaFacebookF },
  { key: "instagram", label: "Instagram", icon: FaInstagram },
  { key: "tiktok", label: "TikTok", icon: FaTiktok },
  { key: "x", label: "X", icon: FaXTwitter },
  { key: "youtube", label: "YouTube", icon: FaYoutube },
];

export async function Footer() {
  const [settings, categories, year] = await Promise.all([getSettings(), getCategories(), copyrightYear()]);
  const chatUrl = whatsappChatUrl(settings.whatsappNumber);
  const socials = SOCIAL.filter((s) => settings.socialLinks[s.key]);

  return (
    <footer className="mt-20 bg-brand-deep text-cream/85">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="space-y-4">
          <Logo storeName={settings.storeName} tone="dark" showTagline />
          <p className="max-w-xs text-sm leading-relaxed text-cream/70">
            {settings.storeDescription || "Everyday essentials for your home, your family and you — ordered easily on WhatsApp."}
          </p>
          {socials.length > 0 && (
            <ul className="flex gap-2" aria-label="Social media">
              {socials.map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <a
                    href={settings.socialLinks[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-9 items-center justify-center rounded-full bg-white/10 text-cream transition-colors hover:bg-accent hover:text-brand-deep"
                    aria-label={label}
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cream">Shop</h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/shop" className="hover:text-accent">
                All products
              </Link>
            </li>
            {(categories ?? []).slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link href={`/categories/${category.slug}`} className="hover:text-accent">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cream">Help</h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/about#how-it-works" className="hover:text-accent">
                How ordering works
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-accent">
                About us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-accent">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-accent">
                Your cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cream">Get in touch</h2>
          <ul className="space-y-3 text-sm">
            {chatUrl && (
              <li>
                <a href={chatUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-accent">
                  <FaWhatsapp className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  WhatsApp {formatPhoneDisplay(settings.whatsappNumber)}
                </a>
              </li>
            )}
            {settings.supportPhone && (
              <li>
                <a href={`tel:${settings.supportPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2.5 hover:text-accent">
                  <FiPhone className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  {settings.supportPhone}
                </a>
              </li>
            )}
            {settings.supportEmail && (
              <li>
                <a href={`mailto:${settings.supportEmail}`} className="inline-flex items-center gap-2.5 break-all hover:text-accent">
                  <FiMail className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  {settings.supportEmail}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex gap-2.5">
                <FiMapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{settings.address}</span>
              </li>
            )}
            {settings.openingHours && (
              <li className="flex gap-2.5">
                <FiClock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="whitespace-pre-line">{settings.openingHours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.storeName}. All rights reserved.
          </p>
          <p>Prices are in Ghana Cedis (GHS). Orders are confirmed with you on WhatsApp.</p>
        </div>
      </div>
    </footer>
  );
}
