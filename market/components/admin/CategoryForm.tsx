"use client";

import { useState, type FormEvent } from "react";
import { categoryInputSchema, flattenIssues, slugify, type CategoryDTO, type ImageAsset } from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Toggle } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ApiClientError, api } from "@/lib/api";
import { SingleImageUploader } from "./ImageUploader";

interface CategoryFormProps {
  open: boolean;
  category: CategoryDTO | null;
  onClose: () => void;
  onSaved: (category: CategoryDTO) => void;
}

interface State {
  name: string;
  slug: string;
  description: string;
  image: ImageAsset | null;
  isActive: boolean;
  displayOrder: string;
}

const toState = (c: CategoryDTO | null): State => ({
  name: c?.name ?? "",
  slug: c?.slug ?? "",
  description: c?.description ?? "",
  image: c?.image ?? null,
  isActive: c?.isActive ?? true,
  displayOrder: String(c?.displayOrder ?? 0),
});

/** Create/edit dialog. Mount it with a `key` so it resets for each category. */
export function CategoryForm({ open, category, onClose, onSaved }: CategoryFormProps) {
  const [state, setState] = useState<State>(() => toState(category));
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
    const payload = {
      name: state.name,
      slug: state.slug.trim() ? slugify(state.slug) : undefined,
      description: state.description,
      image: state.image,
      isActive: state.isActive,
      displayOrder: Number(state.displayOrder) || 0,
    };
    const parsed = categoryInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const saved = category
        ? await api.patch<CategoryDTO>(`/admin/categories/${category.id}`, payload)
        : await api.post<CategoryDTO>("/admin/categories", payload);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else setFormError("Could not save the category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      title={category ? `Edit ${category.name}` : "New category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {category ? "Save changes" : "Create category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <p className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger" role="alert">
            {formError}
          </p>
        )}
        <Input label="Name" required value={state.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={60} placeholder="e.g. Bathing Soaps" />
        <Input
          label="URL slug"
          value={state.slug}
          onChange={(e) => set("slug", e.target.value)}
          error={errors.slug}
          placeholder={slugify(state.name) || "generated-from-name"}
          hint={`Category page: /categories/${(state.slug.trim() ? slugify(state.slug) : slugify(state.name)) || "…"}`}
        />
        <Textarea label="Description" rows={3} value={state.description} onChange={(e) => set("description", e.target.value)} error={errors.description} maxLength={500} />
        <SingleImageUploader
          label="Category image"
          value={state.image}
          onChange={(image) => set("image", image)}
          folder="categories"
          aspect="aspect-[4/3]"
          hint="Shown on the homepage category tiles. Landscape, at least 800×600."
          error={errors.image}
        />
        <Input
          label="Display order"
          inputMode="numeric"
          value={state.displayOrder}
          onChange={(e) => set("displayOrder", e.target.value)}
          error={errors.displayOrder}
          hint="Lower numbers appear first"
          wrapperClassName="max-w-[160px]"
        />
        <Toggle checked={state.isActive} onChange={(v) => set("isActive", v)} label="Visible in store" description="Hidden categories and their products don't appear to customers." />
      </form>
    </Modal>
  );
}
