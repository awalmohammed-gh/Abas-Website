import type { Metadata } from "next";
import { NotificationsView } from "./NotificationsView";

export const metadata: Metadata = { title: "Notifications" };

// Rendered only after the client confirms the admin session.
export const instant = false;

export default function Page() {
  return <NotificationsView />;
}
