"use client";

import { useState, type FormEvent } from "react";
import { bannerInputSchema, flattenIssues, type BannerDTO, type ImageAsset } from "@aba-mart/shared";
import { SingleImageUploader } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Toggle } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ApiClientError, api } from "@/lib/api";

interface State {
  eyebrow: string;
  title: string;
  description: string;
  desktopImage: ImageAsset | null;
  mobileImage: ImageAsset | null;
  buttonText: string;
  buttonLink: string;
  displayOrder: string;
  isActive: boolean;
}

const toState = (banner: BannerDTO | null, nextOrder: number): State => ({
  eyebrow: banner?.eyebrow ?? "",
  title: banner?.title ?? "",
  description: banner?.description ?? "",
  desktopImage: banner?.desktopImage ?? null,
  mobileImage: banner?.mobileImage ?? null,
  buttonText: banner?.buttonText ?? "Shop now",
  buttonLink: banner?.buttonLink ?? "/shop",
  displayOrder: String(banner?.displayOrder ?? nextOrder),
  isActive: banner?.isActive ?? true,
});

export function BannerForm({
  banner,
  nextOrder,
  onClose,
  onSaved,
}: {
  banner: BannerDTO | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (banner: BannerDTO) => void;
}) {
  const [state, setState] = useState<State>(() => toState(banner, nextOrder));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof State>(key: K, value: State[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const payload = { ...state, displayOrder: Number(state.displayOrder) || 0 };
    const parsed = bannerInputSchema.safeParse(payload);
    if (!parsed.success) {
      const fields = flattenIssues(parsed.error.issues);
      if (!state.desktopImage) fields.desktopImage = "Upload a desktop image";
      setErrors(fields);
      return;
    }
    setSaving(true);
    try {
      const saved = banner ? await api.patch<BannerDTO>(`/admin/banners/${banner.id}`, payload) : await api.post<BannerDTO>("/admin/banners", payload);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else setFormError("Could not save the banner.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      locked={saving}
      size="lg"
      title={banner ? "Edit banner" : "New banner"}
      description="Banners rotate at the top of the homepage."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="banner-form" loading={saving}>
            {banner ? "Save banner" : "Create banner"}
          </Button>
        </>
      }
    >
      <form id="banner-form" onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <p className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger" role="alert">
            {formError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <SingleImageUploader
            label="Desktop image"
            required
            value={state.desktopImage}
            onChange={(img) => set("desktopImage", img)}
            folder="banners"
            aspect="aspect-[8/3]"
            hint="1920 × 720 px (8:3). Keep important content left of centre."
            error={errors.desktopImage}
          />
          <SingleImageUploader
            label="Mobile image"
            value={state.mobileImage}
            onChange={(img) => set("mobileImage", img)}
            folder="banners"
            aspect="aspect-square"
            hint="1080 × 1080 px (1:1). Optional — the desktop image is cropped if empty."
            error={errors.mobileImage}
          />
        </div>
        <Input label="Small heading" value={state.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} error={errors.eyebrow} maxLength={60} hint="Optional line above the heading, e.g. a tagline or price" />
        <Input label="Heading" required value={state.title} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={90} />
        <Textarea label="Description" rows={2} value={state.description} onChange={(e) => set("description", e.target.value)} error={errors.description} maxLength={220} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Button text" value={state.buttonText} onChange={(e) => set("buttonText", e.target.value)} error={errors.buttonText} maxLength={30} />
          <Input
            label="Button link"
            value={state.buttonLink}
            onChange={(e) => set("buttonLink", e.target.value)}
            error={errors.buttonLink}
            placeholder="/categories/skincare"
            hint="A store path like /shop, or a full https:// link"
          />
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Input label="Display order" inputMode="numeric" value={state.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} hint="Lower numbers show first" />
          <Toggle checked={state.isActive} onChange={(v) => set("isActive", v)} label="Active" description="Inactive banners are hidden." />
        </div>
      </form>
    </Modal>
  );
}
