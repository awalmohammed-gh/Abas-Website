import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMetadataSettings } from "@/lib/catalog";
import { AdminPwaShell } from "@/components/admin/AdminPwaShell";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getMetadataSettings();
  return {
    title: { default: "Admin", template: `%s | ${storeName} Admin` },
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    manifest: "/admin-manifest.json",
    appleWebApp: { capable: true, title: "ABA Admin", statusBarStyle: "black-translucent" },
    icons: { apple: [{ url: "/icons/admin-apple-icon-180.png", sizes: "180x180", type: "image/png" }] },
    other: { "apple-mobile-web-app-capable": "yes" },
  };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminPwaShell>{children}</AdminPwaShell>;
}
