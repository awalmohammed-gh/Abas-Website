import { getBanners } from "@/lib/catalog";
import { HeroCarousel } from "./HeroCarousel";

/** Admin-managed banners (Admin → Banners); the homepage skips the hero when there are none. */
export async function Hero() {
  const banners = await getBanners();
  if (!banners.length) return null;
  return <HeroCarousel banners={banners} />;
}

export function HeroSkeleton() {
  return <div className="skeleton h-[100vh] w-full rounded-none" aria-hidden="true" />;
}
