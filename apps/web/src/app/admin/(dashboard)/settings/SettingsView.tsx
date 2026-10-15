"use client";

import { useState, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa";
import {
  buildWhatsAppUrl,
  flattenIssues,
  formatPhoneDisplay,
  normalizePhoneNumber,
  settingsInputSchema,
  type ImageAsset,
  type SocialLinks,
  type StoreSettingsDTO,
} from "@aba-mart/shared";
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from "@/components/admin/AdminUI";
import { SingleImageUploader } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { ApiClientError, api } from "@/lib/api";

const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
];

function SettingsForm({ initial, onSaved }: { initial: StoreSettingsDTO; onSaved: (s: StoreSettingsDTO) => void }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof StoreSettingsDTO>(key: K, value: StoreSettingsDTO[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const normalized = normalizePhoneNumber(form.whatsappNumber);

  async function submit(event: FormEvent) {
    event.preventDefault();
    // updatedAt is stripped by the schema on both sides.
    const parsed = settingsInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error.issues));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const saved = await api.put<StoreSettingsDTO>("/admin/settings", form);
      setForm(saved);
      setErrors({});
      toast.success("Settings saved. The storefront updates within moments.");
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiClientError) setErrors(error.fieldErrors);
      toast.error(error instanceof ApiClientError ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <Panel title="WhatsApp ordering">
          <div className="space-y-3 p-4 sm:p-5">
            <Input
              label="WhatsApp number"
              required
              type="tel"
              value={form.whatsappNumber}
              onChange={(e) => set("whatsappNumber", e.target.value)}
              error={errors.whatsappNumber}
              placeholder="233241234567"
              hint="International format with country code, no + sign. Customer orders are sent to this number."
            />
            {normalized ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                Orders go to <strong className="text-ink">{formatPhoneDisplay(normalized)}</strong>
                <a href={buildWhatsAppUrl(normalized, "Test message from the ABA Mart admin")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-whatsapp hover:underline">
                  <FaWhatsapp aria-hidden="true" /> Test link
                </a>
              </p>
            ) : (
              <p className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-700">Until a valid number is saved, customers can&apos;t send orders.</p>
            )}
          </div>
        </Panel>

        <Panel title="Store details">
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <Input label="Store name" required value={form.storeName} onChange={(e) => set("storeName", e.target.value)} error={errors.storeName} maxLength={60} wrapperClassName="sm:col-span-2" />
            <Textarea
              label="Store description"
              rows={3}
              value={form.storeDescription}
              onChange={(e) => set("storeDescription", e.target.value)}
              error={errors.storeDescription}
              maxLength={500}
              wrapperClassName="sm:col-span-2"
              hint="Used on the homepage, footer and in search results."
            />
            <Input label="Support phone" type="tel" value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} error={errors.supportPhone} maxLength={30} />
            <Input label="Support email" type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} error={errors.supportEmail} maxLength={120} />
            <Input label="Address or location" value={form.address} onChange={(e) => set("address", e.target.value)} error={errors.address} maxLength={200} wrapperClassName="sm:col-span-2" />
            <Textarea
              label="Business hours"
              rows={2}
              value={form.openingHours}
              onChange={(e) => set("openingHours", e.target.value)}
              error={errors.openingHours}
              maxLength={200}
              placeholder={"Mon–Sat: 8am – 7pm\nSun: 12pm – 5pm"}
              wrapperClassName="sm:col-span-2"
            />
          </div>
        </Panel>

        <Panel title="Announcement bar">
          <div className="p-4 sm:p-5">
            <Input
              label="Announcement text"
              value={form.announcement}
              onChange={(e) => set("announcement", e.target.value)}
              error={errors.announcement}
              maxLength={160}
              hint="Shown above the navigation on every page. Leave blank to hide it."
              placeholder="e.g. Free pickup at our shop · Order on WhatsApp"
            />
          </div>
        </Panel>

        <Panel title="Social media">
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
              <Input
                key={key}
                label={label}
                type="url"
                value={form.socialLinks[key]}
                placeholder={placeholder}
                onChange={(e) => set("socialLinks", { ...form.socialLinks, [key]: e.target.value })}
                error={errors[`socialLinks.${key}`]}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Branding">
          <div className="space-y-5 p-4 sm:p-5">
            <SingleImageUploader
              label="Logo"
              value={form.logo}
              onChange={(img: ImageAsset | null) => set("logo", img)}
              folder="branding"
              aspect="aspect-[3/1]"
              hint="Optional. Wide PNG with transparent background, about 480×160. Replaces the built-in ABA Mart wordmark."
              error={errors.logo}
            />
            <SingleImageUploader
              label="Favicon"
              value={form.favicon}
              onChange={(img: ImageAsset | null) => set("favicon", img)}
              folder="branding"
              aspect="aspect-square w-24"
              hint="Optional. Square PNG, 512×512. Defaults to the ABA Mart mark."
              error={errors.favicon}
            />
          </div>
        </Panel>
        <div className="sticky bottom-4 rounded-2xl border border-line bg-white p-3 shadow-pop xl:static xl:shadow-none">
          <Button type="submit" className="w-full" loading={saving}>
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}

export function SettingsView() {
  const { data, error, loading, reload, mutate } = useAdminResource<StoreSettingsDTO>("/admin/settings");
  return (
    <>
      <PageHeader title="Store settings" description="Central store information used across the website." />
      {loading && !data ? (
        <LoadingBlock label="Loading settings" />
      ) : error && !data ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : data ? (
        <SettingsForm key={data.updatedAt ?? "new"} initial={data} onSaved={(saved) => mutate(() => saved)} />
      ) : null}
    </>
  );
}
