import Image from "next/image";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { ButtonLink } from "@/components/ui/Button";
import { getBanners } from "@/lib/catalog";

export async function Promotions() {
  const banners = await getBanners();
  return <section className="container-page py-3" aria-labelledby="promotion-heading"><div className="mart-promotion">
    <div className="relative z-10"><h2 id="promotion-heading" className="text-2xl font-extrabold leading-tight sm:text-3xl">Upgrade Your Lifestyle<br /><span className="text-accent">Without Breaking the Bank.</span></h2><p className="mt-2 text-sm font-medium text-white">Discover T-shirts, buggy jeans, shorts and everyday soap essentials.</p><ButtonLink href="/shop?onSale=true" variant="accent" size="sm" className="mt-4" rightIcon={<FiArrowRight aria-hidden="true" />}>Shop Deals</ButtonLink></div>
    <Link href={banners[0]?.buttonLink || "/shop"} className="mart-promo-art" aria-label={banners[0]?.buttonText || "Explore our latest collections"}><Image src="/images/home/tshirt-unbranded-v2.webp" alt="Plain blue and yellow T-shirts" fill sizes="(min-width: 1024px) 600px, 50vw" className="object-cover" /></Link>
  </div></section>;
}
