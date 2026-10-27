"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  LIMITS,
  flattenIssues,
  parseCedisToPesewas,
  pesewasToInput,
  productInputSchema,
  slugify,
  variantLabel,
  type AdminProductDTO,
  type CategoryDTO,
  type ImageAsset,
} from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input, Select, Toggle } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Panel } from "./AdminUI";
import { ImageListUploader } from "./ImageUploader";
import { PRODUCT_VARIETIES, isVarietyOption, parseValues, rowKey, syncVariants, toggleVariety, type OptionRow, type VariantRow } from "./productOptions";

interface FormState {
  name: string;
  slug: string;
  description: string;
  category: string;
  subCategory: string;
  regularPrice: string;
  discountPrice: string;
  images: ImageAsset[];
  hasVariants: boolean;
  options: OptionRow[];
  variants: VariantRow[];
  stock: string;
  lowStockThreshold: string;
  isFeatured: boolean;
  isActive: boolean;
}

function fromProduct(product?: AdminProductDTO | null): FormState {
  if (!product) {
    return {
      name: "",
      slug: "",
      description: "",
      category: "",
      subCategory: "",
      regularPrice: "",
      discountPrice: "",
      images: [],
      hasVariants: false,
      options: [{ key: rowKey(), name: "", valuesText: "" }],
      variants: [],
      stock: "0",
      lowStockThreshold: String(LIMITS.defaultLowStockThreshold),
      isFeatured: false,
      isActive: true,
    };
  }
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category?.id ?? "",
    subCategory: product.subCategory ?? "",
    regularPrice: pesewasToInput(product.compareAtPrice ?? product.price),
    discountPrice: product.compareAtPrice ? pesewasToInput(product.price) : "",
    images: product.images,
    hasVariants: product.variants.length > 0,
    options: product.options.length
      ? product.options.map((o) => ({ key: rowKey(), name: o.name, valuesText: o.values.join(", ") }))
      : [{ key: rowKey(), name: "", valuesText: "" }],
    variants: product.variants.map((v) => ({
      key: rowKey(),
      id: v.id,
      attributes: v.attributes,
      sku: v.sku ?? "",
      price: pesewasToInput(v.price),
      stock: String(v.stock),
      isActive: v.isActive,
    })),
    stock: String(product.variants.length ? 0 : product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    isFeatured: product.isFeatured,
    isActive: product.isActive,
  };
}

/** Maps API/schema error paths to form field names. */
function mapErrors(fields: Record<string, string>, hasDiscount: boolean): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, message] of Object.entries(fields)) {
    let key = path;
    if (path === "compareAtPrice") key = "regularPrice";
    else if (path === "price") key = hasDiscount ? "discountPrice" : "regularPrice";
    else if (/^variants\.\d+\.compareAtPrice$/.test(path)) key = path.replace("compareAtPrice", "price");
    if (!(key in result)) result[key] = message;
  }
  return result;
}

interface ProductFormProps {
  product?: AdminProductDTO | null;
  categories: CategoryDTO[];
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => fromProduct(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const setOptions = (options: OptionRow[]) => {
    setForm((f) => ({ ...f, options, variants: syncVariants(options, f.variants) }));
    setDirty(true);
  };

  const updateVariant = (key: string, patch: Partial<VariantRow>) => {
    setForm((f) => ({ ...f, variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));
    setDirty(true);
  };

  function buildPayload(): { payload?: unknown; errors?: Record<string, string> } {
    const errs: Record<string, string> = {};
    const regular = parseCedisToPesewas(form.regularPrice);
    const discount = form.discountPrice.trim() ? parseCedisToPesewas(form.discountPrice) : null;
    if (regular === null) errs.regularPrice = "Enter a price like 45 or 45.50";
    if (form.discountPrice.trim() && discount === null) errs.discountPrice = "Enter a price like 39.99";

    const variants = form.hasVariants
      ? form.variants.map((v, i) => {
          const price = v.price.trim() ? parseCedisToPesewas(v.price) : null;
          if (v.price.trim() && price === null) errs[`variants.${i}.price`] = "Invalid price";
          const stock = Number(v.stock);
          if (!Number.isInteger(stock) || stock < 0) errs[`variants.${i}.stock`] = "Whole number";
          return { id: v.id, attributes: v.attributes, sku: v.sku.trim() || null, price, stock, isActive: v.isActive };
        })
      : [];

    const stock = Number(form.stock);
    if (!form.hasVariants && (!Number.isInteger(stock) || stock < 0)) errs.stock = "Enter a whole number, 0 or more";
    const threshold = Number(form.lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) errs.lowStockThreshold = "Enter a whole number";
    if (!form.category) errs.category = "Choose a category";
    if (Object.keys(errs).length) return { errors: errs };

    const payload = {
      name: form.name,
      slug: form.slug.trim() ? slugify(form.slug) : undefined,
      description: form.description,
      category: form.category,
      subCategory: form.subCategory,
      price: discount ?? regular!,
      compareAtPrice: discount !== null ? regular : null,
      images: form.images,
      options: form.hasVariants
        ? form.options.map((o) => ({ name: o.name.trim(), values: parseValues(o.valuesText) })).filter((o) => o.name || o.values.length)
        : [],
      variants,
      stock: form.hasVariants ? 0 : stock,
      lowStockThreshold: threshold,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    };

    const check = productInputSchema.safeParse(payload);
    if (!check.success) return { errors: mapErrors(flattenIssues(check.error.issues), discount !== null) };
    return { payload };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { payload, errors: clientErrors } = buildPayload();
    if (clientErrors) {
      setErrors(clientErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (product) {
        const saved = await api.patch<AdminProductDTO>(`/admin/products/${product.id}`, payload);
        setForm(fromProduct(saved));
        setDirty(false);
        toast.success("Product saved");
        router.refresh();
      } else {
        const saved = await api.post<AdminProductDTO>("/admin/products", payload);
        setDirty(false);
        toast.success(`${saved.name} created`);
        router.push("/admin/products");
      }
    } catch (error) {
      if (error instanceof ApiClientError && Object.keys(error.fieldErrors).length) {
        setErrors(mapErrors(error.fieldErrors, !!form.discountPrice.trim()));
      }
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  }

  const varietyOption = form.options.find(isVarietyOption);
  const selectedVarieties = form.hasVariants && varietyOption ? parseValues(varietyOption.valuesText) : [];
  const varietyChoices = [...PRODUCT_VARIETIES, ...selectedVarieties].filter((value, index, values) => values.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index);
  const discountValue = parseCedisToPesewas(form.discountPrice);
  const regularValue = parseCedisToPesewas(form.regularPrice);
  const savings = discountValue !== null && regularValue !== null && regularValue > discountValue ? Math.floor(((regularValue - discountValue) * 100) / regularValue) : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <Panel title="Details">
          <div className="space-y-4 p-4 sm:p-5">
            <Input label="Product name" required value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={120} placeholder="e.g. Aba's Liquid Soap 500ml" />
          </div>
        </Panel>

        <Panel title="Pricing">
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <Input
              label="Price"
              required
              inputMode="decimal"
              leading="GHS"
              value={form.regularPrice}
              onChange={(e) => set("regularPrice", e.target.value)}
              error={errors.regularPrice}
              placeholder="0.00"
            />
            <Input
              label="Discounted price (optional)"
              inputMode="decimal"
              leading="GHS"
              value={form.discountPrice}
              onChange={(e) => set("discountPrice", e.target.value)}
              error={errors.discountPrice}
              placeholder="Optional"
              hint={savings ? `Customers see ${savings}% off` : "Leave blank if not on sale"}
            />
          </div>
        </Panel>

        <Panel title="Varieties and stock">
          <div className="space-y-5 p-4 sm:p-5">
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Variety / scent (optional)</legend>
              <p className="mt-1 text-xs text-muted">Select the varieties you sell. Each choice has its own stock and appears in the customer&apos;s WhatsApp order.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {varietyChoices.map((value) => {
                  const checked = selectedVarieties.some((selected) => selected.toLowerCase() === value.toLowerCase());
                  return (
                    <label key={value} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm", checked ? "border-brand bg-brand-50 font-semibold text-brand" : "border-line text-ink hover:border-brand/40")}>
                      <input type="checkbox" checked={checked} className="size-4 accent-brand" onChange={() => {
                        const next = toggleVariety(form.options, form.hasVariants ? form.variants : [], value, form.stock);
                        if (!next) { toast.error("Remove an existing option before adding varieties."); return; }
                        setForm((previous) => ({ ...previous, ...next }));
                        setDirty(true);
                        setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !/^(options|variants|stock)/.test(key))));
                      }} />
                      {value}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <details className="rounded-xl border border-line p-3" open={Object.keys(errors).some((key) => key.startsWith("options")) ? true : undefined}>
              <summary className="cursor-pointer text-sm font-semibold text-brand">Other options, sizes or bottle volumes</summary>
              <div className="mt-4 space-y-4">
            <Toggle
              checked={form.hasVariants}
              onChange={(checked) => {
                setForm((f) => ({ ...f, hasVariants: checked, variants: checked ? syncVariants(f.options, f.variants) : f.variants }));
                setDirty(true);
              }}
              label="This product has options"
              description="For example clothing sizes and colours, or bottle volumes. Stock is tracked for each combination."
            />

            {form.hasVariants && (
                <div className="space-y-3">
                  {form.options.map((option, index) => (
                    <div key={option.key} className="grid gap-2 rounded-xl border border-line bg-cream/50 p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-start">
                      <Input
                        label={index === 0 ? "Option name" : undefined}
                        aria-label="Option name"
                        value={option.name}
                        placeholder={index === 0 ? "Size" : index === 1 ? "Colour" : "Volume"}
                        onChange={(e) => setOptions(form.options.map((o) => (o.key === option.key ? { ...o, name: e.target.value } : o)))}
                        error={errors[`options.${index}.name`]}
                        maxLength={30}
                      />
                      <Input
                        label={index === 0 ? "Values (comma separated)" : undefined}
                        aria-label="Option values"
                        value={option.valuesText}
                        placeholder={index === 0 ? "S, M, L, XL" : index === 1 ? "Black, White" : "250ml, 500ml"}
                        onChange={(e) => setOptions(form.options.map((o) => (o.key === option.key ? { ...o, valuesText: e.target.value } : o)))}
                        error={errors[`options.${index}.values`]}
                      />
                      <button
                        type="button"
                        onClick={() => setOptions(form.options.filter((o) => o.key !== option.key))}
                        disabled={form.options.length === 1}
                        className={cn("inline-flex h-11 items-center justify-center rounded-xl px-3 text-muted hover:bg-danger-50 hover:text-danger disabled:opacity-30", index === 0 && "sm:mt-7")}
                        aria-label="Remove option"
                      >
                        <FiTrash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  {form.options.length < LIMITS.maxProductOptions && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<FiPlus className="size-4" aria-hidden="true" />}
                      onClick={() => setOptions([...form.options, { key: rowKey(), name: "", valuesText: "" }])}
                    >
                      Add another option
                    </Button>
                  )}
                  {(errors.options || errors.variants) && (
                    <p className="text-xs font-medium text-danger" role="alert">
                      {errors.options || errors.variants}
                    </p>
                  )}
                </div>

            )}
              </div>
            </details>

            {!form.hasVariants && <Input label="Stock quantity" required inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value)} error={errors.stock} />}
                {form.hasVariants && form.variants.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-3 bg-cream/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
                      <span>Variety / option</span>
                      <span>Price (optional)</span>
                      <span>Stock</span>
                      <span className="w-16 text-right">Available</span>
                    </div>
                    <ul className="divide-y divide-line">
                      {form.variants.map((variant, i) => (
                        <li key={variant.key} className="grid grid-cols-2 gap-3 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:items-center">
                          <p className="col-span-2 text-sm font-semibold text-ink md:col-span-1">{variantLabel(variant.attributes)}</p>
                          <div>
                            <p className="mb-1 text-xs text-muted md:hidden">Price (optional)</p>
                            <input
                              aria-label={`Price override for ${variantLabel(variant.attributes)} in GHS`}
                              value={variant.price}
                              inputMode="decimal"
                              onChange={(e) => updateVariant(variant.key, { price: e.target.value })}
                              placeholder="Use product price"
                              className={cn("h-11 w-full rounded-lg border px-3 text-base md:text-sm", errors[`variants.${i}.price`] ? "border-danger" : "border-line")}
                            />
                            {errors[`variants.${i}.price`] && <p className="mt-1 text-xs text-danger">{errors[`variants.${i}.price`]}</p>}
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-muted md:hidden">Stock quantity</p>
                            <input
                              aria-label={`Stock for ${variantLabel(variant.attributes)}`}
                              value={variant.stock}
                              inputMode="numeric"
                              onChange={(e) => updateVariant(variant.key, { stock: e.target.value })}
                              className={cn("h-11 w-full rounded-lg border px-3 text-base md:text-sm", errors[`variants.${i}.stock`] ? "border-danger" : "border-line")}
                            />
                            {errors[`variants.${i}.stock`] && <p className="mt-1 text-xs text-danger">{errors[`variants.${i}.stock`]}</p>}
                          </div>
                          <label className="flex min-h-11 items-center justify-end gap-2 text-xs text-muted md:w-16">
                            <span className="md:sr-only">Available</span>
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(e) => updateVariant(variant.key, { isActive: e.target.checked })}
                              className="size-4 accent-brand"
                              aria-label={`${variantLabel(variant.attributes)} available for sale`}
                            />
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Organisation">
          <div className="space-y-4 p-4 sm:p-5">
            <Select
              label="Category"
              required
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              error={errors.category}
              placeholder="Choose a category"
              options={categories.map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (hidden)` }))}
            />
            {categories.length === 0 && (
              <p className="text-xs text-muted">
                No categories yet.{" "}
                <Link href="/admin/categories" className="font-semibold text-brand hover:underline">
                  Create one first
                </Link>
                .
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Product photos">
          <div className="p-4 sm:p-5">
            <ImageListUploader value={form.images} onChange={(images) => set("images", images)} folder="products" max={LIMITS.maxProductImages} error={errors.images} />
          </div>
        </Panel>

        <details className="rounded-2xl border border-line bg-white p-4 sm:p-5" open={errors.lowStockThreshold ? true : undefined}>
          <summary className="cursor-pointer text-sm font-semibold text-brand">More product settings</summary>
          <div className="mt-4 space-y-4">
            <Input label="Low-stock alert at" inputMode="numeric" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} error={errors.lowStockThreshold} />
            <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label="Show in store" description="Hidden products can't be viewed or ordered." />
            <Toggle checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} label="Feature on homepage" description="Appears in the Featured products section." />
          </div>
        </details>

        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] flex gap-2 rounded-2xl border border-line bg-white p-3 shadow-pop xl:static xl:shadow-none">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.push("/admin/products")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={saving}>
            {product ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>
    </form>
  );
}
