import type { StoreSettingsDTO } from "@aba-mart/shared";

const stripSlash = (url: string) => url.replace(/\/+$/, "");

export const siteConfig = {
  name: "ABA Mart",
  tagline: "Everyday essentials, delivered with care",
  description:
    "Shop soaps, shower gels, skincare, clothing, household essentials and more from ABA Mart. Order in minutes on WhatsApp — no account needed.",
  url: stripSlash(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  locale: "en_GH",
  currency: "GHS",
  mainNav: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "My orders", href: "/my-orders" },
  ],
} as const;

/** Used when the API cannot be reached, so the layout still renders honestly. */
export const fallbackSettings: StoreSettingsDTO = {
  storeName: siteConfig.name,
  storeDescription: siteConfig.description,
  logo: null,
  favicon: null,
  whatsappNumber: "",
  supportPhone: "",
  supportEmail: "",
  address: "",
  openingHours: "",
  announcement: "",
  socialLinks: { facebook: "", instagram: "", tiktok: "", x: "", youtube: "" },
  updatedAt: null,
};
