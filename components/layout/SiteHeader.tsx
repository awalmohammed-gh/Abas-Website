import { getCategories, getSettings } from "@/lib/catalog";
import { PushPrompt } from "@/components/notifications/PushPrompt";
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
        categories={(categories ?? []).map((c) => ({ name: c.name, slug: c.slug, count: c.productCount ?? 0 }))}
        notificationsEnabled={settings.notifications.enabled}
      />
      {settings.notifications.enabled && <PushPrompt storeName={settings.storeName} />}
    </>
  );
}

export function SiteHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-white/95">
      <div className="container-page flex min-h-[76px] items-center justify-between py-3 lg:min-h-[88px] lg:py-4">
        <div className="skeleton h-12 w-[72px] lg:h-14 lg:w-[84px]" />
        <div className="hidden gap-6 lg:flex">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-4 w-14" />
          ))}
        </div>
        <div className="skeleton size-10" />
      </div>
    </div>
  );
}
