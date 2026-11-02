import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiDroplet, FiShoppingBag, FiPackage } from "react-icons/fi";
import { getCategories } from "@/lib/catalog";
import { storefrontCategories, STOREFRONT_CATEGORY_LIMIT } from "@/lib/storefrontCategories";

const TILE_TONES = ["bg-[#e3efff]", "bg-[#fff2cc]", "bg-[#ffe5e9]", "bg-[#e9e4ff]", "bg-[#e0f4eb]", "bg-[#ffeadb]"];

/** Decorative category illustrations; admin-uploaded category photography takes priority. */
function categoryIllustration(name: string): string | undefined {
  if (/detergent/i.test(name)) return "/images/home/category-detergent.webp";
  if (/jeans/i.test(name)) return "/images/home/buggy-jeans-unbranded-v2.webp";
  if (/short/i.test(name)) return "/images/home/category-shorts.webp";
  if (/t-shirt/i.test(name)) return "/images/home/tshirt-unbranded-v2.webp";
  if (/hand.*wash/i.test(name)) return "/images/home/category-hand-wash.webp";
  if (/dishwash/i.test(name)) return "/images/home/category-dishwashing.webp";
  if (/soap/i.test(name)) return "/images/home/aba-liquid-soap-v1.webp";
}

export async function Categories() {
  const categories = await getCategories();
  const visible = storefrontCategories(categories);
  if (!visible.length) return null;
  return (
    <section id="categories" className="container-page py-8 sm:py-10 scroll-mt-40" aria-labelledby="categories-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 id="categories-heading" className="text-lg font-bold tracking-tight text-ink sm:text-xl">Shop by Categories</h2>
        <Link href="/shop" className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-brand hover:underline">View all categories<FiArrowRight className="size-3.5" aria-hidden="true" /></Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((category, index) => (
          <li key={category.id} className="min-w-0"><Link href={`/categories/${category.slug}`} className={`mart-category group relative flex h-full flex-col items-center overflow-hidden rounded-xl text-center ${TILE_TONES[index % TILE_TONES.length]}`}>
            <span className={`relative flex h-32 w-full items-center justify-center overflow-hidden transition-transform group-hover:scale-105`}>
              {category.image || categoryIllustration(category.name) ? <Image src={category.image?.url || categoryIllustration(category.name)!} alt="" fill sizes="(min-width: 1024px) 190px, 45vw" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" /> : <span className="text-brand/65" aria-hidden="true">{/soap|wash|detergent|care/i.test(category.name) ? <FiDroplet className="size-16" /> : /fashion|jeans|cloth/i.test(category.name) ? <FiShoppingBag className="size-16" /> : <FiPackage className="size-16" />}</span>}
            </span>
            <span className="flex min-h-12 w-full items-center justify-center gap-2 bg-white/35 px-2 py-2 text-sm font-bold text-ink group-hover:text-brand">{category.name}<FiArrowRight className="size-3 shrink-0" aria-hidden="true" /></span>
          </Link></li>
        ))}
      </ul>
    </section>
  );
}

export function CategoriesSkeleton() {
  return <div className="container-page py-7 sm:py-9" aria-hidden="true"><div className="skeleton mb-5 h-6 w-56" /><div className="grid grid-cols-3 gap-4 lg:grid-cols-6">{Array.from({ length: STOREFRONT_CATEGORY_LIMIT }, (_, i) => <div key={i} className="skeleton mx-auto size-24 rounded-2xl" />)}</div></div>;
}
