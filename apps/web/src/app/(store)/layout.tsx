import { Suspense, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { SiteHeader, SiteHeaderSkeleton } from "@/components/layout/SiteHeader";
import { CartProvider } from "@/contexts/CartContext";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Suspense fallback={<SiteHeaderSkeleton />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={<div className="mt-20 h-72 bg-brand-deep" aria-hidden="true" />}>
        <Footer />
      </Suspense>
    </CartProvider>
  );
}
