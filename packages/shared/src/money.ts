/**
 * All money is stored and transported as integer pesewas (1 GHS = 100 pesewas)
 * so that no arithmetic is ever done on floating-point cedi values.
 */
export const PESEWAS_PER_CEDI = 100;

const integerFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Formats integer pesewas as "GHS 1,234.50". */
export function formatGHS(pesewas: number): string {
  if (!Number.isSafeInteger(pesewas)) return "GHS —";
  const negative = pesewas < 0;
  const abs = Math.abs(pesewas);
  const cedis = Math.trunc(abs / PESEWAS_PER_CEDI);
  const rest = abs % PESEWAS_PER_CEDI;
  const value = `${integerFormatter.format(cedis)}.${String(rest).padStart(2, "0")}`;
  return `${negative ? "-" : ""}GHS ${value}`;
}

const CEDI_INPUT = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

/**
 * Parses a cedi amount typed by a person ("45", "45.5", "1,250.00") into
 * integer pesewas without floating-point math. Returns null when invalid.
 */
export function parseCedisToPesewas(input: string | number): number | null {
  const raw = typeof input === "number" ? input.toFixed(2) : input.trim().replace(/,/g, "");
  const match = CEDI_INPUT.exec(raw);
  if (!match) return null;
  const cedis = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return cedis * PESEWAS_PER_CEDI + Number(fraction);
}

/** Converts pesewas to a plain "45.00" string for form inputs. */
export function pesewasToInput(pesewas: number | null | undefined): string {
  if (pesewas === null || pesewas === undefined || !Number.isSafeInteger(pesewas)) return "";
  const cedis = Math.trunc(pesewas / PESEWAS_PER_CEDI);
  const rest = Math.abs(pesewas % PESEWAS_PER_CEDI);
  return `${cedis}.${String(rest).padStart(2, "0")}`;
}

/** Percentage saved, rounded down, or null if there is no real discount. */
export function discountPercent(price: number, compareAtPrice: number | null | undefined): number | null {
  if (!compareAtPrice || compareAtPrice <= price || price < 0) return null;
  return Math.floor(((compareAtPrice - price) * 100) / compareAtPrice);
}
