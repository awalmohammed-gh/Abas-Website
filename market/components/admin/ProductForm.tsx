"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  LIMITS,
  categoryInputSchema,
  flattenIssues,
  parseCedisToPesewas,
  pesewasToInput,
  productInputSchema,
  slugify,
  variantLabel,
  type AdminProductDTO,
  type CategoryDTO,
  type ImageAsset,
  type ProductInput,
} from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Toggle } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Panel } from "./AdminUI";
import { ImageListUploader } from "./ImageUploader";
import { parseValues, rowKey, syncVariants, type OptionRow, type VariantRow } from "./productOptions";

const isSize = (option: OptionRow) => /^(size|volume|bottle size|capacity)$/i.test(option.name.trim());
const isColour = (option: OptionRow) => /^(colou?r)$/i.test(option.name.trim());
const COLOUR_PALETTE = [
  { name: "Black", hex: "#171717" },
  { name: "White", hex: "#ffffff" },
  { name: "Grey", hex: "#808080" },
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Sky blue", hex: "#7dd3fc" },
  { name: "Red", hex: "#dc2626" },
  { name: "Burgundy", hex: "#800020" },
  { name: "Pink", hex: "#f472b6" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Green", hex: "#16a34a" },
  { name: "Olive", hex: "#808000" },
  { name: "Yellow", hex: "#facc15" },
  { name: "Orange", hex: "#f97316" },
  { name: "Brown", hex: "#92400e" },
  { name: "Beige", hex: "#d8c3a5" },
  { name: "Cream", hex: "#fff1d6" },
  { name: "Gold", hex: "#d4af37" },
  { name: "Silver", hex: "#c0c0c0" },
] as const;

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
      options: [],
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
      : [],
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
  const [addedCategories, setAddedCategories] = useState<CategoryDTO[]>([]);
  const [categoryName, setCategoryName] = useState(product?.category?.name ?? "");
  const [categoryError, setCategoryError] = useState("");
  const availableCategories = [...categories, ...addedCategories.filter((added) => !categories.some((category) => category.id === added.id))];

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
    setForm((f) => {
      const variants = syncVariants(options, f.variants);
      if (!f.hasVariants && variants.length === 1) variants[0]!.stock = f.stock;
      const stock = !options.length && f.hasVariants ? String(f.variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)) : f.stock;
      return { ...f, options, variants, hasVariants: options.length > 0, stock };
    });
    setDirty(true);
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !/^(options|variants|stock)/.test(key))));
  };

  const setOptionValues = (matches: (option: OptionRow) => boolean, name: string, valuesText: string) => {
    const option = form.options.find(matches);
    if (!valuesText.trim()) setOptions(form.options.filter((item) => item !== option));
    else if (option) setOptions(form.options.map((item) => item === option ? { ...item, valuesText } : item));
    else if (form.options.length >= LIMITS.maxProductOptions) toast.error("Remove another option before adding this one.");
    else setOptions([...form.options, { key: rowKey(), name, valuesText }]);
  };

  const updateVariant = (key: string, patch: Partial<VariantRow>) => {
    setForm((f) => ({ ...f, variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));
    setDirty(true);
  };

  function buildPayload(category: string): { payload?: ProductInput; errors?: Record<string, string> } {
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
    if (Object.keys(errs).length) return { errors: errs };

    const payload = {
      name: form.name,
      slug: form.slug.trim() ? slugify(form.slug) : undefined,
      description: form.description,
      category,
      subCategory: form.subCategory,
      price: discount ?? regular!,
      compareAtPrice: discount !== null ? regular : null,
      images: form.images,
      options: form.hasVariants
        ? form.options.map((o) => ({ name: o.name.trim(), values: parseValues(o.valuesText) }))
        : [],
      variants,
      stock: form.hasVariants ? 0 : stock,
      lowStockThreshold: threshold,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    };

    const check = productInputSchema.safeParse(payload);
    if (!check.success) return { errors: mapErrors(flattenIssues(check.error.issues), discount !== null) };
    return { payload: check.data };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const categoryCheck = categoryInputSchema.safeParse({ name: categoryName });
    if (!categoryCheck.success) {
      setCategoryError(flattenIssues(categoryCheck.error.issues).name ?? "Enter a category name.");
      return;
    }
    setCategoryError("");
    const existingCategory = availableCategories.find((category) => category.name.toLowerCase() === categoryCheck.data.name.toLowerCase());
    // Validate the full product before creating a new category. Replace the temporary ID before saving.
    const { payload, errors: clientErrors } = buildPayload(existingCategory?.id ?? "000000000000000000000000");
    if (clientErrors) {
      setErrors(clientErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (!payload) return;
    setErrors({});
    setSaving(true);
    try {
      let category = existingCategory;
      if (!category) {
        try {
          category = await api.post<CategoryDTO>("/admin/categories", categoryCheck.data);
        } catch (error) {
          setCategoryError(error instanceof ApiClientError ? error.message : "Could not save the category. Try again.");
          return;
        }
        const createdCategory = category;
        setAddedCategories((current) => [...current, createdCategory]);
      }
      payload.category = category.id;
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

  const sizeOption = form.options.find(isSize);
  const colourOption = form.options.find(isColour);
  const selectedColours = parseValues(colourOption?.valuesText ?? "");
  const extraOptions = form.options.filter((option) => option !== sizeOption && option !== colourOption);
  const optionError = (option: OptionRow | undefined) => {
    const index = option ? form.options.indexOf(option) : -1;
    return errors[`options.${index}.values`] || errors[`options.${index}.name`];
  };
  const discountValue = parseCedisToPesewas(form.discountPrice);
  const regularValue = parseCedisToPesewas(form.regularPrice);
  const savings = discountValue !== null && regularValue !== null && regularValue > discountValue ? Math.floor(((regularValue - discountValue) * 100) / regularValue) : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <Panel title="Details">
          <div className="space-y-4 p-4 sm:p-5">
            <Input label="Product name" required value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={120} placeholder="e.g. Blue handbag, Liquid soap or Summer top" />
            <Input label="Category" required value={categoryName} onChange={(event) => { setCategoryName(event.target.value); setCategoryError(""); setDirty(true); }} maxLength={60} placeholder="e.g. Bags, Kitchenware or Liquid soap" hint="Type any category. We will save it with the product." error={categoryError || errors.category} disabled={saving} />
            <Textarea label="Description (optional)" value={form.description} onChange={(e) => set("description", e.target.value)} error={errors.description} maxLength={5000} rows={3} hint="Leave blank if no description is needed." />
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

        <Panel title="Sizes, colours and stock">
          <div className="space-y-5 p-4 sm:p-5">
            <p className="text-sm text-muted">Not every product needs sizes or colours. Leave these blank if they do not apply.</p>
            <Input label="Sizes / volumes (optional)" value={sizeOption?.valuesText ?? ""} onChange={(event) => setOptionValues(isSize, "Size", event.target.value)} placeholder="e.g. S, M, L or 500ml, 1L or One size" hint="Type any sizes, separated by commas." error={optionError(sizeOption)} disabled={saving} />
            <fieldset disabled={saving} className="space-y-3">
              <legend className="text-sm font-medium text-ink">Colours (optional)</legend>
              <p className="text-xs text-muted">Tap the colours you sell. Tap a selected colour again to remove it.</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {COLOUR_PALETTE.map((colour) => {
                  const selected = selectedColours.some((value) => value.toLowerCase() === colour.name.toLowerCase());
                  return (
                    <button
                      key={colour.name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setOptionValues(isColour, "Colour", (selected ? selectedColours.filter((value) => value.toLowerCase() !== colour.name.toLowerCase()) : [...selectedColours, colour.name]).join(", "))}
                      className={cn("relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", selected ? "border-brand bg-brand-50 text-brand" : "border-line bg-white text-ink hover:border-brand/50")}
                    >
                      <span aria-hidden="true" className="size-7 rounded-full border border-black/15 shadow-sm" style={{ backgroundColor: colour.hex }} />
                      <span>{colour.name}</span>
                      {selected && <FiCheck aria-hidden="true" className="absolute right-1.5 top-1.5 size-3.5" />}
                    </button>
                  );
                })}
              </div>
              <Input label="Selected colours" value={colourOption?.valuesText ?? ""} onChange={(event) => setOptionValues(isColour, "Colour", event.target.value)} placeholder="No colours selected" hint="You can also type custom colour names here, separated by commas. Leave blank if colours do not apply." error={optionError(colourOption)} disabled={saving} />
            </fieldset>
            {extraOptions.map((option) => {
              const index = form.options.indexOf(option);
              return (
                <div key={option.key} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-start">
                  <Input label="Other option" value={option.name} placeholder="e.g. Scent, Material or Pack" maxLength={30} onChange={(event) => setOptions(form.options.map((item) => item === option ? { ...item, name: event.target.value } : item))} error={errors[`options.${index}.name`]} disabled={saving} />
                  <Input label="Choices" value={option.valuesText} placeholder="e.g. Lemon, Lavender" hint="Separate choices with commas." onChange={(event) => setOptions(form.options.map((item) => item === option ? { ...item, valuesText: event.target.value } : item))} error={errors[`options.${index}.values`]} disabled={saving} />
                  <Button variant="ghost" size="icon" className="sm:mt-7" aria-label={`Remove ${option.name || "option"}`} onClick={() => setOptions(form.options.filter((item) => item !== option))} disabled={saving}><FiTrash2 aria-hidden="true" /></Button>
                </div>
              );
            })}
            {form.options.length < LIMITS.maxProductOptions && <Button variant="secondary" size="sm" leftIcon={<FiPlus aria-hidden="true" />} onClick={() => setOptions([...form.options, { key: rowKey(), name: "", valuesText: "" }])} disabled={saving}>Add another option</Button>}
            {(errors.options || errors.variants) && <p className="text-xs font-medium text-danger" role="alert">{errors.options || errors.variants}</p>}
            {form.hasVariants && form.variants.length > 0 && <p className="text-xs text-muted">Enter stock for each choice below. Leave its price blank to use the main product price.</p>}
            {!form.hasVariants && <Input label="Stock quantity" required inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value)} error={errors.stock} />}
                {form.hasVariants && form.variants.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-3 bg-cream/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
                      <span>Size / colour / option</span>
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
        <Panel title="Product photos">
          <div className="p-4 sm:p-5">
            <ImageListUploader value={form.images} onChange={(images) => set("images", images)} folder="products" max={LIMITS.maxProductImages} error={errors.images} />
          </div>
        </Panel>

        <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-brand">More product settings</h3>
          <div className="mt-4 space-y-4">
            <Input label="Low-stock alert at" inputMode="numeric" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} error={errors.lowStockThreshold} />
            <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label="Show in store" description="Hidden products can't be viewed or ordered." />
            <Toggle checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} label="Feature on homepage" description="Appears in the Featured products section." />
          </div>
        </div>

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
