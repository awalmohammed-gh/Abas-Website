import { buildWhatsAppUrl, type StoreSettingsDTO } from "@aba-mart/shared";

export { buildWhatsAppUrl };

/** Click-to-chat link for general enquiries. Returns null when no number is configured. */
export function whatsappChatUrl(number: string | null | undefined, text?: string): string | null {
  if (!number) return null;
  return buildWhatsAppUrl(number, text);
}

/**
 * General "chat with us" link. Uses the support message set in Admin → Settings →
 * WhatsApp when there is one, otherwise the page's own default text.
 */
export function supportChatUrl(
  settings: Pick<StoreSettingsDTO, "whatsappNumber" | "whatsappSupportMessage">,
  fallbackText?: string,
): string | null {
  return whatsappChatUrl(settings.whatsappNumber, settings.whatsappSupportMessage || fallbackText);
}

/** Why customers cannot prepare a WhatsApp order right now, or null when they can. */
export function whatsappOrderingNotice(settings: Pick<StoreSettingsDTO, "whatsappNumber" | "whatsappOrderingEnabled">): string | null {
  if (!settings.whatsappNumber) return "WhatsApp ordering is being set up. Please check back soon.";
  if (!settings.whatsappOrderingEnabled) return "WhatsApp ordering is paused right now. You can still chat with us on WhatsApp.";
  return null;
}

/**
 * Opens a tab synchronously inside the click handler, before any network
 * request. Browsers block window.open() after an await, so we reserve the tab
 * first and point it at WhatsApp once the order has been recorded.
 */
export function reserveWhatsAppWindow(): Window | null {
  try {
    const win = window.open("", "_blank");
    if (win) {
      win.document.title = "Opening WhatsApp…";
      win.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:24px;color:#202924">Preparing your order for WhatsApp…</p>';
    }
    return win;
  } catch {
    return null;
  }
}

/** Sends a reserved tab to WhatsApp. Returns false if the tab was blocked or closed. */
export function openReservedWindow(win: Window | null, url: string): boolean {
  if (!win || win.closed) return false;
  try {
    win.opener = null;
    win.location.href = url;
    return true;
  } catch {
    return false;
  }
}
