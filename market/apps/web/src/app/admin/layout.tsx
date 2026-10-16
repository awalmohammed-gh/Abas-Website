import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMetadataSettings } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getMetadataSettings();
  return {
    title: { default: "Admin", template: `%s | ${storeName} Admin` },
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
