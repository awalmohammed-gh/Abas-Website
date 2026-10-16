import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { siteConfig } from "@/config/site";
import { getMetadataSettings } from "@/lib/catalog";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap", weight: ["500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getMetadataSettings();
  const description = settings.storeDescription || siteConfig.description;
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: `${settings.storeName} — ${siteConfig.tagline}`, template: `%s | ${settings.storeName}` },
    description,
    applicationName: settings.storeName,
    openGraph: {
      type: "website",
      siteName: settings.storeName,
      locale: siteConfig.locale,
      title: settings.storeName,
      description,
      ...(settings.logo ? { images: [{ url: settings.logo.url, alt: settings.storeName }] } : {}),
    },
    twitter: { card: "summary_large_image", title: settings.storeName, description },
    ...(settings.favicon ? { icons: { icon: settings.favicon.url, apple: settings.favicon.url } } : {}),
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
      <body className="flex min-h-dvh min-w-0 flex-col">{children}</body>
    </html>
  );
}
