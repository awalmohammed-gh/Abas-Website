import { FiArrowRight, FiShoppingCart } from "react-icons/fi";
import { ButtonLink } from "@/components/ui/Button";
import { getCategories } from "@/lib/catalog";
import { storefrontCategories } from "@/lib/storefrontCategories";
import { HeroCarousel } from "./HeroCarousel";

export async function Hero() {
  const categories = storefrontCategories(await getCategories());
  const hrefFor = (name: string) => {
    const category = categories.find(item => item.name === name);
    return category ? `/categories/${category.slug}` : `/shop?q=${encodeURIComponent(name)}`;
  };
  const slides = [
    { id: "aba-tshirt", title: "T-shirts", image: "/images/home/tshirt-unbranded-v2.webp", alt: "Plain royal blue and yellow T-shirts", href: hrefFor("T-shirt") },
    { id: "aba-jeans", title: "Buggy Jeans", image: "/images/home/buggy-jeans-unbranded-v2.webp", alt: "Unbranded wide-leg denim jeans", href: hrefFor("Buggy Jeans") },
    { id: "aba-soap", title: "ABA Liquid Soap", image: "/images/home/aba-liquid-soap-v1.webp", alt: "Liquid soap bottles with ABA labels", href: hrefFor("Liquid Soap") },
  ];
  return (
    <section className="container-page pt-2" aria-label="Welcome to ABA Mart">
      <div className="mart-hero">
        <div className="mart-hero-copy">
          <h1 className="max-w-xl text-[2.5rem] font-extrabold leading-[1.12] tracking-[-0.04em] text-brand-deep sm:text-5xl lg:text-[3.5rem]">Everything You Love,<br /><span className="text-brand">All in One Place.</span></h1>
          {/* Phones keep the hero to a short banner so products show on the first screen. */}
          <p className="mt-4 hidden max-w-md text-sm font-medium leading-relaxed text-brand-deep sm:block sm:text-lg">Discover amazing products, explore exciting collections and enjoy shopping made simple.</p>
          <div className="mt-3 flex flex-wrap gap-3 sm:mt-5">
            <ButtonLink href="/shop" size="md" leftIcon={<FiShoppingCart aria-hidden="true" />} rightIcon={<FiArrowRight className="max-sm:hidden" aria-hidden="true" />}>Shop Now</ButtonLink>
            <ButtonLink href="/shop?onSale=true" size="md" variant="secondary" className="border-brand text-brand-deep max-sm:hidden">View Deals</ButtonLink>
          </div>
        </div>
        <HeroCarousel slides={slides} />
      </div>
    </section>
  );
}
export function HeroSkeleton() {
  return <div className="container-page pt-2" aria-hidden="true"><div className="skeleton h-[200px] rounded-xl sm:h-[340px] sm:rounded-2xl" /></div>;
}
