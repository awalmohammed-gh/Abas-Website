import type { Metadata } from "next";
import ShopPage from "../shop/page";
import { getMetadataSettings } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getMetadataSettings();
  return {
    title: "All Products — Shop Online in Ghana",
    description: `Explore all products and collections at ${storeName}. Order on WhatsApp with fast delivery in Ghana.`,
    alternates: { canonical: "/products" },
    openGraph: {
      type: "website",
      locale: "en_GH",
      siteName: storeName,
      title: `All Products | ${storeName}`,
      description: `Explore all products and collections at ${storeName}.`,
      url: "/products",
    },
    twitter: {
      card: "summary_large_image",
      title: `All Products | ${storeName}`,
    },
  };
}

export default ShopPage;
