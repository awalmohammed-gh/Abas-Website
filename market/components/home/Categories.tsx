import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiGrid } from "react-icons/fi";
import { getCategories } from "@/lib/catalog";

const TILE_TONES = ["bg-[#eef3e8]", "bg-[#fff0dc]", "bg-[#eeeaf5]", "bg-[#e7eff5]", "bg-[#f7e9e5]"];

export async function Categories() {
  const categories = await getCategories();
  if (!categories?.length) return null;
  const visible = categories.filter((category) => (category.productCount ?? 0) > 0);
  if (!visible.length) return null;
  return (
    <section className="container-page py-7 sm:py-9" aria-labelledby="categories-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 id="categories-heading" className="text-lg font-bold tracking-tight text-ink sm:text-xl">What are you shopping for?</h2>
        <Link href="/shop" className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-brand hover:underline">Browse all<FiArrowRight className="size-3.5" aria-hidden="true" /></Link>
      </div>
      <ul className="relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-6 xl:grid-cols-8">
        <li className="w-24 shrink-0 sm:w-auto"><Link href="/shop" className="group flex h-full flex-col items-center gap-2.5 rounded-xl py-1 text-center"><span className="flex size-20 items-center justify-center rounded-2xl bg-brand text-white transition-colors group-hover:bg-brand-deep"><FiGrid className="size-7" aria-hidden="true" /></span><span className="text-xs font-semibold text-brand">Shop everything</span></Link></li>
        {visible.slice(0, 7).map((category, index) => (
          <li key={category.id} className="w-24 shrink-0 sm:w-auto"><Link href={`/categories/${category.slug}`} className="group flex h-full flex-col items-center gap-2.5 rounded-xl py-1 text-center">
            <span className={`relative flex size-20 items-center justify-center overflow-hidden rounded-2xl ${TILE_TONES[index % TILE_TONES.length]} ring-1 ring-black/3 transition-shadow group-hover:ring-brand/30`}>
              {category.image ? <Image src={category.image.url} alt="" fill sizes="80px" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" /> : <span className="font-display text-2xl font-bold text-brand/60" aria-hidden="true">{category.name.slice(0, 2).toUpperCase()}</span>}
            </span>
            <span className="line-clamp-2 text-xs font-medium text-ink group-hover:text-brand">{category.name}</span>
            <span className="-mt-1.5 text-[10px] text-muted">{category.productCount} item{category.productCount === 1 ? "" : "s"}</span>
          </Link></li>
        ))}
      </ul>
    </section>
  );
}

export function CategoriesSkeleton() {
  return <div className="container-page py-7 sm:py-9" aria-hidden="true"><div className="skeleton mb-5 h-6 w-56" /><div className="grid grid-cols-4 gap-4 sm:grid-cols-8">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton mx-auto size-20 rounded-2xl" />)}</div></div>;
}