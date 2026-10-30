const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 minutes ago", "yesterday", "just now". */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  const formatter = new Intl.RelativeTimeFormat("en-GH", { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(Math.round(seconds / 60), "minute");
}

export const STORE_TIME_ZONE = "Africa/Accra";

const dateFormatter = new Intl.DateTimeFormat("en-GH", {
  day: "numeric", month: "short", year: "numeric", timeZone: STORE_TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-GH", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  hourCycle: "h23", timeZone: STORE_TIME_ZONE, timeZoneName: "short",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** A consistent Ghana date and time, including GMT, on both server and client. */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** datetime-local has no offset. Ghana uses GMT (UTC+00), regardless of the admin's device zone. */
export function storeDateTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value) return null;
  return date.toISOString();
}
