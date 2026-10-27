import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toaster } from "@/components/ui/Toast";
import { siteConfig } from "@/config/site";
import { getCategories, getMetadataSettings } from "@/lib/catalog";
import { PwaManifestManager } from "@/components/layout/PwaManifestManager";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap", weight: ["500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const [settings, categories] = await Promise.all([getMetadataSettings(), getCategories()]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const storeName = settings.storeName || siteConfig.name;
  const description =
    settings.storeDescription ||
    `${storeName} — Everyday essentials, clothing, beauty & home goods in Ghana. Fast order via WhatsApp click-to-chat with reliable delivery across Ghana.`;
  const categoryKeywords = categories?.map((c) => c.name) ?? [];
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const ogImages = settings.logo ? [{ url: settings.logo.url, alt: storeName }] : [];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${storeName} — Online Store in Ghana`,
      template: `%s | ${storeName} — Online Store in Ghana`,
    },
    description,
    keywords: [
      storeName,
      "online shopping Ghana",
      "buy online Ghana",
      "Ghana online store",
      "order on WhatsApp Ghana",
      "Accra online shopping",
      "reliable delivery Ghana",
      ...categoryKeywords,
    ],
    applicationName: storeName,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      siteName: storeName,
      locale: "en_GH",
      title: `${storeName} — Online Store in Ghana`,
      description,
      url: siteUrl,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${storeName} — Online Store in Ghana`,
      description,
      images: ogImages.map((img) => img.url),
    },
    verification: googleVerification ? { google: googleVerification } : undefined,
    icons: {
      icon: settings.favicon?.url ?? "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/icons/store-192x192.png",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#174C3C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GH" className={`${inter.variable} ${dmSans.variable} antialiased`}>
      <body className="flex min-h-dvh min-w-0 flex-col">
        <Suspense fallback={null}>
          <PwaManifestManager />
        </Suspense>
        {children}
        <Toaster />
        <ConfirmDialog />
      </body>
    </html>
  );
}
