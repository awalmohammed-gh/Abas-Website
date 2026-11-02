import { getSettings } from "@/lib/catalog";
import { PushPrompt } from "@/components/notifications/PushPrompt";
import { Navbar } from "./Navbar";

/** Server wrapper: loads settings, then renders the interactive navbar. */
export async function SiteHeader() {
  const settings = await getSettings();
  return (
    <>
      {/* Only shown when an admin sets announcement text in Settings. */}
      {settings.announcement && (
        <div className="bg-brand-deep text-white">
          <p className="container-page py-2 text-center text-xs font-medium tracking-wide sm:text-[13px]">{settings.announcement}</p>
        </div>
      )}
      <Navbar
        storeName={settings.storeName}
        logo={settings.logo}
        whatsappNumber={settings.whatsappNumber}
        supportMessage={settings.whatsappSupportMessage}
        supportPhone={settings.supportPhone}
        notificationsEnabled={settings.notifications.enabled}
      />
      {settings.notifications.enabled && <PushPrompt storeName={settings.storeName} />}
    </>
  );
}

export function SiteHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-white" aria-hidden="true">
      <div className="container-page flex items-center gap-4 py-2.5">
        <div className="skeleton h-11 w-36 shrink-0" />
        <div className="hidden gap-3 lg:flex">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-7 w-20 shrink-0" />)}</div>
        <div className="skeleton hidden h-12 max-w-sm flex-1 xl:block" />
        <div className="skeleton ml-auto size-11 shrink-0" />
      </div>
    </div>
  );
}
