import { LIMITS, type VariantAttribute } from "@aba-mart/shared";

export const PRODUCT_VARIETIES = ["Lemon", "Orange", "Sunflower", "Rose", "Lavender", "Coconut", "Aloe Vera", "Mint", "Jasmine", "Apple"] as const;
export const LIQUID_SOAP_VOLUMES = ["250ml", "500ml", "1L", "2L", "5L", "10L", "25L"] as const;

export interface OptionRow { key: string; name: string; valuesText: string }
export interface VariantRow {
  key: string;
  id?: string;
  attributes: VariantAttribute[];
  sku: string;
  price: string;
  stock: string;
  isActive: boolean;
}

let rowSeed = 0;
export const rowKey = () => `row-${++rowSeed}`;
export const parseValues = (text: string) => [...new Set(text.split(",").map((value) => value.trim()).filter(Boolean))];
const comboKey = (values: string[]) => values.map((value) => value.toLowerCase()).join("|");
export const isVarietyOption = (option: OptionRow) => /^(variety|scent|fragrance)$/i.test(option.name.trim());
export const isVolumeOption = (option: OptionRow) => /^(volume|bottle size|capacity)$/i.test(option.name.trim());
export const isSizeOption = (option: OptionRow) => /^size$/i.test(option.name.trim());

/** Retain IDs, stock, and prices for combinations that are still selected. */
export function syncVariants(options: OptionRow[], current: VariantRow[]): VariantRow[] {
  const parsed = options.map((option) => ({ name: option.name.trim(), values: parseValues(option.valuesText) })).filter((option) => option.name && option.values.length);
  if (!parsed.length) return [];
  let combos: string[][] = [[]];
  for (const option of parsed) combos = combos.flatMap((combo) => option.values.map((value) => [...combo, value]));
  combos = combos.slice(0, LIMITS.maxVariants);
  const existing = new Map(current.map((row) => [comboKey(row.attributes.map((attribute) => attribute.value)), row]));
  return combos.map((values) => {
    const attributes = values.map((value, index) => ({ name: parsed[index]!.name, value }));
    const match = existing.get(comboKey(values));
    return match ? { ...match, attributes } : { key: rowKey(), attributes, sku: "", price: "", stock: "0", isActive: true };
  });
}

export function toggleVariety(options: OptionRow[], current: VariantRow[], value: string, stock: string) {
  return toggleOption(options, current, value, stock, isVarietyOption, "Variety");
}

export function toggleVolume(options: OptionRow[], current: VariantRow[], value: string, stock: string) {
  return toggleOption(options, current, value, stock, isVolumeOption, "Volume");
}

export function toggleSize(options: OptionRow[], current: VariantRow[], value: string, stock: string) {
  return toggleOption(options, current, value, stock, isSizeOption, "Size");
}

function toggleOption(options: OptionRow[], current: VariantRow[], value: string, stock: string, matches: (option: OptionRow) => boolean, name: string) {
  const option = options.find(matches);
  const values = option ? parseValues(option.valuesText) : [];
  const selected = values.some((item) => item.toLowerCase() === value.toLowerCase());
  const nextValues = selected ? values.filter((item) => item.toLowerCase() !== value.toLowerCase()) : [...values, value];
  const otherOptions = options.filter((item) => item !== option && (item.name.trim() || parseValues(item.valuesText).length));
  if (!option && otherOptions.length >= LIMITS.maxProductOptions) return null;
  const nextOptions = nextValues.length
    ? option ? options.map((item) => item === option ? { ...option, valuesText: nextValues.join(", ") } : item)
      : [...otherOptions, { key: rowKey(), name, valuesText: nextValues.join(", ") }]
    : otherOptions;
  const variants = syncVariants(nextOptions, current);
  // Choosing the first variety for a plain product keeps its current stock.
  if (!current.length && variants.length === 1) variants[0]!.stock = stock;
  return {
    options: nextOptions.length ? nextOptions : [{ key: rowKey(), name: "", valuesText: "" }],
    variants,
    hasVariants: variants.length > 0,
    stock: !variants.length && current.length ? String(current.filter((row) => row.isActive).reduce((sum, row) => sum + (Number(row.stock) || 0), 0)) : stock,
  };
}
