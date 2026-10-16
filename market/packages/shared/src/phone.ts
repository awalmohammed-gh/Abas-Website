/**
 * Normalises a phone number to international digits without a leading plus,
 * which is the format WhatsApp click-to-chat links require.
 *
 * Ghana numbers are accepted in local form (024 123 4567) and international
 * form (+233 24 123 4567). Other international numbers are accepted when they
 * are written with a country code.
 */
export function normalizePhoneNumber(input: string): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim().replace(/[\s\-().]/g, "");
  if (!value) return null;

  if (value.startsWith("+")) value = value.slice(1);
  else if (value.startsWith("00")) value = value.slice(2);
  else if (/^0\d{9}$/.test(value)) value = `233${value.slice(1)}`;

  if (!/^\d+$/.test(value)) return null;

  // Common mistake: "+233 024..." keeps the local trunk zero.
  if (/^2330\d{9}$/.test(value)) value = `233${value.slice(4)}`;

  if (value.startsWith("233")) {
    return /^233[235]\d{8}$/.test(value) ? value : null;
  }

  return /^[1-9]\d{7,14}$/.test(value) ? value : null;
}

/** "233241234567" -> "+233 24 123 4567" */
export function formatPhoneDisplay(digits: string | null | undefined): string {
  if (!digits) return "";
  if (/^233\d{9}$/.test(digits)) {
    return `+233 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return `+${digits}`;
}
