import { getCategories, getSettings } from "@/lib/catalog";
import { PushPrompt } from "@/components/notifications/PushPrompt";
import { storefrontCategories } from "@/lib/storefrontCategories";
import { Navbar } from "./Navbar";

/** Server wrapper: loads settings and categories, then renders the interactive navbar. */
export async function SiteHeader() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  return (
    <>
      {settings.announcement && (
        <div className="bg-brand-deep text-cream">
          <p className="container-page py-2 text-center text-xs font-medium tracking-wide sm:text-[13px]">{settings.announcement}</p>
        </div>
      )}
      <Navbar
        storeName={settings.storeName}
        logo={settings.logo}
        whatsappNumber={settings.whatsappNumber}
        supportMessage={settings.whatsappSupportMessage}
        supportPhone={settings.supportPhone}
        categories={storefrontCategories(categories).map((c) => ({ name: c.name, slug: c.slug, count: c.productCount ?? 0 }))}
        notificationsEnabled={settings.notifications.enabled}
      />
      {settings.notifications.enabled && <PushPrompt storeName={settings.storeName} />}
    </>
  );
}

export function SiteHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-white" aria-hidden="true">
      <div className="container-page flex flex-wrap items-center gap-4 py-2.5 md:flex-nowrap md:gap-6 md:py-3">
        <div className="skeleton h-11 w-36 shrink-0" />
        <div className="skeleton order-3 h-14 w-full md:order-none md:flex-1" />
        <div className="skeleton ml-auto size-11 shrink-0" />
      </div>
      <div className="border-t border-line"><div className="container-page flex gap-4 overflow-hidden py-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-7 w-24 shrink-0" />)}</div></div>
    </div>
  );
}
