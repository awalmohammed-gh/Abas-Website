import { getBanners } from "@/lib/catalog";
import { heroBanners } from "@/config/hero-banners";
import { HeroCarousel } from "./HeroCarousel";

/** Product highlights followed by any additional admin-managed promotions. */
export async function Hero() {
  const banners = await getBanners();
  return <HeroCarousel banners={[...heroBanners, ...banners]} />;
}

export function HeroSkeleton() {
  return <div className="skeleton h-[640px] w-full rounded-none sm:h-[760px] md:h-[clamp(440px,40vw,620px)]" aria-hidden="true" />;
}
