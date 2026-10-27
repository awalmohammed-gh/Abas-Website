"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FaWhatsapp } from "react-icons/fa";
import { FiBell, FiExternalLink, FiHome, FiImage, FiInfo, FiLayout } from "react-icons/fi";
import {
  buildWhatsAppUrl,
  flattenIssues,
  formatPhoneDisplay,
  normalizePhoneNumber,
  settingsInputSchema,
  type ImageAsset,
  type PushSubscriberStats,
  type SocialLinks,
  type StoreSettingsDTO,
} from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from "@/components/admin/AdminUI";
import { SingleImageUploader } from "@/components/admin/ImageUploader";
import { NotificationComposer } from "@/components/admin/NotificationComposer";
import { NotificationManager } from "@/components/admin/NotificationManager";
import { PushSubscriberSummary } from "@/components/admin/PushSubscriberSummary";
import { BrandMark, Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Toggle } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { ApiClientError, api } from "@/lib/api";
import { broadcastStoreEvent } from "@/lib/storeChannel";
import { cn } from "@/lib/utils";

type SectionId = "general" | "branding" | "whatsapp" | "notifications" | "storefront";

const SECTIONS: { id: SectionId; label: string; description: string; icon: IconType }[] = [
  { id: "general", label: "General", description: "Name, contact details, hours", icon: FiInfo },
  { id: "branding", label: "Branding", description: "Logo and browser icon", icon: FiImage },
  { id: "whatsapp", label: "WhatsApp", description: "Ordering number and messages", icon: FaWhatsapp },
  { id: "notifications", label: "Notifications", description: "Alerts and announcements", icon: FiBell },
  { id: "storefront", label: "Storefront", description: "Announcement bar and homepage", icon: FiLayout },
];

/** Which section a validation error belongs to, so the page can jump to it. */
function sectionFor(field: string): SectionId {
  if (field.startsWith("logo") || field.startsWith("favicon")) return "branding";
  if (field.startsWith("whatsapp")) return "whatsapp";
  if (field.startsWith("notifications")) return "notifications";
  if (field.startsWith("storefront") || field === "announcement") return "storefront";
  return "general";
}

const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
];

function SectionIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

/** Where a setting shows up on the store, so admins know what a change affects. */
function UsedOn({ children }: { children: ReactNode }) {
  return <p className="flex items-start gap-1.5 text-xs text-muted"><FiHome className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" /> {children}</p>;
}

function BrandingPreview({ storeName, logo, favicon }: { storeName: string; logo: ImageAsset | null; favicon: ImageAsset | null }) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line">
        <p className="border-b border-line bg-cream px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Navbar</p>
        <div className="flex min-h-16 items-center bg-white px-4 py-2"><Logo storeName={storeName} logo={logo} /></div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        <p className="border-b border-line bg-cream px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Footer and admin menu</p>
        <div className="flex min-h-16 items-center bg-brand-deep px-4 py-3"><Logo storeName={storeName} logo={logo} tone="dark" /></div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        <p className="border-b border-line bg-cream px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Browser tab</p>
        <div className="flex items-center gap-2 bg-white px-4 py-3">
          <span className="flex min-w-0 max-w-full items-center gap-2 rounded-t-lg border border-b-0 border-line bg-cream px-3 py-1.5 text-xs text-ink">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny preview of an uploaded Cloudinary icon
              <img src={favicon.url} alt="" className="size-4 shrink-0 object-contain" />
            ) : (
              <BrandMark className="size-4" />
            )}
            <span className="truncate">{storeName || "Store name"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function MessagePreview({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-xl bg-[#e7f6ec] p-3">
      <div className="ml-auto max-w-[85%] whitespace-pre-line rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm text-ink shadow-sm">{lines.join("\n")}</div>
    </div>
  );
}

function SettingsForm({ initial, onSaved }: { initial: StoreSettingsDTO; onSaved: (s: StoreSettingsDTO) => void }) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get("tab") as SectionId | null;
  const [section, setSection] = useState<SectionId>(SECTIONS.some((s) => s.id === tabParam) ? tabParam! : "general");
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const stats = useAdminResource<PushSubscriberStats>(section === "notifications" ? "/admin/notifications/subscribers" : null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const errorSections = useMemo(() => new Set(Object.entries(errors).filter(([, m]) => m).map(([k]) => sectionFor(k))), [errors]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const choose = (id: SectionId) => {
    setSection(id);
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  };

  const set = <K extends keyof StoreSettingsDTO>(key: K, value: StoreSettingsDTO[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };
  const setNotifications = (patch: Partial<StoreSettingsDTO["notifications"]>) => set("notifications", { ...form.notifications, ...patch });
  const setStorefront = (patch: Partial<StoreSettingsDTO["storefront"]>) => set("storefront", { ...form.storefront, ...patch });

  const normalized = normalizePhoneNumber(form.whatsappNumber);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = settingsInputSchema.safeParse(form);
    if (!parsed.success) {
      const next = flattenIssues(parsed.error.issues);
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) choose(sectionFor(first));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const result = await api.put<StoreSettingsDTO>("/admin/settings", form);
      setForm(result);
      setSaved(result);
      setErrors({});
      // Open store tabs in this browser refresh now; other devices pick it up within a minute.
      broadcastStoreEvent({ type: "settings" });
      toast.success("Settings saved. Open store pages update automatically.");
      onSaved(result);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fieldErrors);
        const first = Object.keys(error.fieldErrors)[0];
        if (first) choose(sectionFor(first));
      }
      toast.error(error instanceof ApiClientError ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const greetingLine = form.whatsappGreeting.trim() || `Hello ${form.storeName.trim() || "ABA Mart"},`;

  return (
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <ul className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
          {SECTIONS.map(({ id, label, description, icon: Icon }) => {
            const active = section === id;
            return (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => choose(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    active ? "bg-brand text-white shadow-sm" : "bg-white text-ink ring-1 ring-line hover:bg-brand-50 lg:bg-transparent lg:ring-0",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-brand")} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {label}
                      {errorSections.has(id) && <span className="size-2 rounded-full bg-danger" aria-label="Has errors" />}
                    </span>
                    <span className={cn("hidden text-xs lg:block", active ? "text-white/75" : "text-muted")}>{description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 pb-24">
        <form id="settings-form" onSubmit={submit} noValidate className="space-y-6">
          {section === "general" && (
            <>
              <SectionIntro title="General">Your store&apos;s name and the contact details customers see.</SectionIntro>
              <Panel title="Store details">
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  <Input label="Store name" required value={form.storeName} onChange={(e) => set("storeName", e.target.value)} error={errors.storeName} maxLength={60} wrapperClassName="sm:col-span-2" />
                  <div className="sm:col-span-2 -mt-2"><UsedOn>Navbar, footer, page titles, WhatsApp messages and the admin.</UsedOn></div>
                  <Textarea label="Store description" rows={3} value={form.storeDescription} onChange={(e) => set("storeDescription", e.target.value)} error={errors.storeDescription} maxLength={500} wrapperClassName="sm:col-span-2" hint="Used in the footer, About page and search results." />
                  <Input label="Contact email" type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} error={errors.supportEmail} maxLength={120} />
                  <Input label="Phone number" type="tel" value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} error={errors.supportPhone} maxLength={30} />
                  <Input label="Address or location" value={form.address} onChange={(e) => set("address", e.target.value)} error={errors.address} maxLength={200} wrapperClassName="sm:col-span-2" />
                  <Textarea label="Business hours" rows={2} value={form.openingHours} onChange={(e) => set("openingHours", e.target.value)} error={errors.openingHours} maxLength={200} placeholder={"Mon–Sat: 8am – 7pm\nSun: 12pm – 5pm"} wrapperClassName="sm:col-span-2" />
                  <div className="sm:col-span-2"><UsedOn>Footer, Contact page and the mobile menu.</UsedOn></div>
                </div>
              </Panel>
              <Panel title="Social media">
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                    <Input key={key} label={label} type="url" value={form.socialLinks[key]} placeholder={placeholder} onChange={(e) => set("socialLinks", { ...form.socialLinks, [key]: e.target.value })} error={errors[`socialLinks.${key}`]} />
                  ))}
                  <div className="sm:col-span-2"><UsedOn>Footer icons. Leave blank to hide.</UsedOn></div>
                </div>
              </Panel>
            </>
          )}

          {section === "branding" && (
            <>
              <SectionIntro title="Branding">Upload your logo and browser icon. Files are stored in your Cloudinary account; the old file is removed only after the new one is saved.</SectionIntro>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Panel title="Upload">
                  <div className="space-y-5 p-4 sm:p-5">
                    <SingleImageUploader label="Logo" value={form.logo} onChange={(img: ImageAsset | null) => set("logo", img)} folder="branding" aspect="aspect-[3/1]" hint="Wide PNG with a transparent background, about 480×160. Remove it to go back to the built-in logo." error={errors.logo} />
                    <SingleImageUploader label="Favicon" value={form.favicon} onChange={(img: ImageAsset | null) => set("favicon", img)} folder="branding" aspect="aspect-square w-24" hint="Square PNG, 512×512. Also used for push alerts and the Home Screen app." error={errors.favicon} />
                  </div>
                </Panel>
                <Panel title="Current branding">
                  <div className="p-4 sm:p-5">
                    <BrandingPreview storeName={form.storeName} logo={form.logo} favicon={form.favicon} />
                    <div className="mt-3"><UsedOn>Navbar, mobile menu, footer, admin menu and sign-in, order previews and the 404 page.</UsedOn></div>
                  </div>
                </Panel>
              </div>
            </>
          )}

          {section === "whatsapp" && (
            <>
              <SectionIntro title="WhatsApp">Customers send orders and questions to this number using WhatsApp click-to-chat. Nothing is sent automatically.</SectionIntro>
              <Panel title="Business number">
                <div className="space-y-3 p-4 sm:p-5">
                  <Input label="WhatsApp number" required type="tel" value={form.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} error={errors.whatsappNumber} placeholder="233278857814" hint="With country code, e.g. 233278857814 or 0278857814 (Ghana numbers are converted automatically)." />
                  {normalized ? (
                    <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      Messages go to <strong className="text-ink">{formatPhoneDisplay(normalized)}</strong>
                      <a href={buildWhatsAppUrl(normalized, `Test message from the ${form.storeName || "store"} admin`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-whatsapp hover:underline">
                        <FaWhatsapp aria-hidden="true" /> Test link
                      </a>
                    </p>
                  ) : (
                    <p className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-700">Until a valid number is saved, customers can&apos;t send orders.</p>
                  )}
                  <UsedOn>Product pages, cart checkout, Contact page, navbar, footer and order help links.</UsedOn>
                </div>
              </Panel>
              <Panel title="Ordering">
                <div className="space-y-4 p-4 sm:p-5">
                  <Toggle
                    label="Accept WhatsApp orders"
                    description="When off, customers can still browse and chat, but the cart and product pages can't prepare order requests."
                    checked={form.whatsappOrderingEnabled}
                    onChange={(checked) => set("whatsappOrderingEnabled", checked)}
                  />
                  <Input label="Order message greeting" value={form.whatsappGreeting} onChange={(e) => set("whatsappGreeting", e.target.value)} error={errors.whatsappGreeting} maxLength={120} placeholder={`Hello ${form.storeName || "ABA Mart"},`} hint="First line of every order message. Leave blank for the default." />
                  <MessagePreview lines={[greetingLine, "", "I would like to place an order.", "", "Order Reference: ABA-000123", "…"]} />
                </div>
              </Panel>
              <Panel title="Customer support">
                <div className="space-y-4 p-4 sm:p-5">
                  <Textarea label="Support chat message" rows={2} value={form.whatsappSupportMessage} onChange={(e) => set("whatsappSupportMessage", e.target.value)} error={errors.whatsappSupportMessage} maxLength={300} placeholder={`Hello ${form.storeName || "ABA Mart"}, I have a question about a product.`} hint="Pre-filled when customers tap “Chat with us”. Leave blank to use a suitable message for each page." />
                  {form.whatsappSupportMessage.trim() && <MessagePreview lines={[form.whatsappSupportMessage.trim()]} />}
                  <UsedOn>“Chat with us” in the navbar and mobile menu, the footer, Contact and About pages, and the homepage WhatsApp section.</UsedOn>
                </div>
              </Panel>
            </>
          )}

          {section === "notifications" && (
            <>
              <SectionIntro title="Notifications">Customer alerts in the store&apos;s notification bell and as browser push alerts, plus order alerts for your team.</SectionIntro>
              <Panel title="Notification preferences">
                <div className="space-y-4 p-4 sm:p-5">
                  <Toggle label="Store notifications" description="Shows the notification bell and the alert invitation on the store. Turning this off hides customer notifications and stops new pushes." checked={form.notifications.enabled} onChange={(checked) => setNotifications({ enabled: checked })} />
                  <Toggle label="New-product notifications" description="Let customers choose to hear about new arrivals." checked={form.notifications.newProducts} disabled={!form.notifications.enabled} onChange={(checked) => setNotifications({ newProducts: checked })} />
                  <Toggle label="Promotional notifications" description="Offers are only sent to customers who switch them on." checked={form.notifications.promotions} disabled={!form.notifications.enabled} onChange={(checked) => setNotifications({ promotions: checked })} />
                  <Toggle label="Admin order alerts" description="Alert the dashboard when a customer prepares a WhatsApp checkout request (before they confirm on WhatsApp)." checked={form.notifications.adminOrderAlerts} onChange={(checked) => setNotifications({ adminOrderAlerts: checked })} />
                  <Input
                    label="Show the alert invitation after (seconds)"
                    type="number"
                    min={5}
                    max={600}
                    value={String(form.notifications.promptDelaySeconds)}
                    onChange={(e) => setNotifications({ promptDelaySeconds: Number(e.target.value) || 0 })}
                    error={errors["notifications.promptDelaySeconds"]}
                    hint="How long a visitor browses before ABA Mart's invitation appears. The browser's own permission prompt only shows after they click Enable."
                    wrapperClassName="max-w-xs"
                    disabled={!form.notifications.enabled}
                  />
                </div>
              </Panel>
              <Panel title="Push subscribers">
                <div className="p-4 sm:p-5"><PushSubscriberSummary stats={stats.data} /></div>
              </Panel>
            </>
          )}

          {section === "storefront" && (
            <>
              <SectionIntro title="Storefront">What customers see at the top of every page and on the homepage.</SectionIntro>
              <Panel title="Announcement bar">
                <div className="space-y-3 p-4 sm:p-5">
                  <Input label="Announcement text" value={form.announcement} onChange={(e) => set("announcement", e.target.value)} error={errors.announcement} maxLength={160} hint="Shown above the navigation on every page. Leave blank to hide it." placeholder="e.g. Free pickup at our shop · Order on WhatsApp" />
                  {form.announcement.trim() && (
                    <div className="overflow-hidden rounded-xl border border-line">
                      <p className="bg-brand-deep px-3 py-2 text-center text-xs font-medium tracking-wide text-cream">{form.announcement.trim()}</p>
                    </div>
                  )}
                </div>
              </Panel>
              <Panel title="Homepage sections">
                <div className="space-y-4 p-4 sm:p-5">
                  <Toggle label="Featured products" description="Products marked as featured in the product editor." checked={form.storefront.showFeaturedProducts} onChange={(checked) => setStorefront({ showFeaturedProducts: checked })} />
                  <Toggle label="New arrivals" description="The newest active products." checked={form.storefront.showNewArrivals} onChange={(checked) => setStorefront({ showNewArrivals: checked })} />
                  <p className="text-sm text-muted">
                    Homepage banners are managed in{" "}
                    <Link href="/admin/banners" className="font-semibold text-brand hover:underline">Banners</Link>.
                  </p>
                </div>
              </Panel>
            </>
          )}
        </form>

        {section === "notifications" && (
          <div className="mt-6 space-y-6">
            <Panel title="Compose and publish">
              <div className="p-4 sm:p-5">
                {dirty && <p className="mb-4 rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-700">Save your preference changes first: publishing uses the saved settings.</p>}
                <NotificationComposer settings={saved.notifications} pushConfigured={stats.data?.configured ?? false} onSaved={() => stats.reload()} />
              </div>
            </Panel>
            <Panel
              title="Recent announcements"
              actions={<Link href="/admin/notifications?scope=customer" className="text-sm font-semibold text-brand hover:underline">Manage all</Link>}
            >
              <NotificationManager initialScope="customer" limit={5} showFilters={false} />
            </Panel>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
          <p className={cn("mr-auto text-sm", dirty ? "font-medium text-accent-700" : "text-muted")} role="status">
            {dirty ? "You have unsaved changes" : "All changes saved"}
          </p>
          {dirty && (
            <Button type="button" variant="secondary" onClick={() => { setForm(saved); setErrors({}); }} disabled={saving}>
              Discard
            </Button>
          )}
          <Button type="submit" form="settings-form" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1 text-sm font-semibold text-brand hover:underline sm:inline-flex">
            View store <FiExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  const { data, error, loading, reload, mutate } = useAdminResource<StoreSettingsDTO>("/admin/settings");
  return (
    <>
      <PageHeader title="Store settings" description="One place for store details, branding, WhatsApp, notifications and the storefront. Changes apply across the whole store." />
      {loading && !data ? (
        <LoadingBlock label="Loading settings" />
      ) : error && !data ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : data ? (
        <SettingsForm initial={data} onSaved={(saved) => mutate(() => saved)} />
      ) : null}
    </>
  );
}

export function SettingsView() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading settings" />}>
      <SettingsContent />
    </Suspense>
  );
}
