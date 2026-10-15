import { cartStore } from "@/contexts/cartStore";
import { guestApi } from "./guest-api";
import { openReservedWindow, reserveWhatsAppWindow } from "./whatsapp";

/** Called inside a click; a blocked or closed tab leaves the cart untouched. */
export async function initiateOrderHandoff(id: string, url: string, reserved?: Window | null): Promise<boolean> {
  const tab = reserved === undefined ? reserveWhatsAppWindow() : reserved;
  if (!openReservedWindow(tab, url)) return false;
  await guestApi.post(`/my-orders/${id}/handoff`);
  await cartStore.refresh();
  return true;
}
