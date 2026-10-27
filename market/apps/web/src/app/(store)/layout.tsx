import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { MobileFloatingNav } from "@/components/layout/MobileFloatingNav";
import { PwaInstallPrompt } from "@/components/layout/PwaInstallPrompt";
import { SiteHeader, SiteHeaderSkeleton } from "@/components/layout/SiteHeader";
import { CartProvider } from "@/contexts/CartContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "ABA Mart", statusBarStyle: "default" },
  icons: { apple: [{ url: "/icons/store-apple-icon-180.png", sizes: "180x180", type: "image/png" }] },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <NotificationsProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {/* Keep the header's overlays above the dock within their shared z-40 layer. */}
        <Suspense fallback={null}>
          <MobileFloatingNav />
        </Suspense>
        <PwaInstallPrompt app="store" />
        <Suspense fallback={<SiteHeaderSkeleton />}>
          <SiteHeader />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pb-24 max-md:pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>
          <Suspense fallback={<div className="mt-20 h-72 bg-brand-deep" aria-hidden="true" />}>
            <Footer />
          </Suspense>
        </div>
      </NotificationsProvider>
    </CartProvider>
  );
}
