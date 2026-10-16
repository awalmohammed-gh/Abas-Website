import Image from "next/image";
import Link from "next/link";
import { FiGrid } from "react-icons/fi";
import type { CategoryDTO } from "@aba-mart/shared";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  categories: CategoryDTO[];
  /** Slug of the selected category, or "" for all products. */
  active: string;
  /** Builds the shop URL for a category (keeping the other filters). */
  hrefFor: (slug: string) => string;
}

const chip = "inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-full border pl-1.5 pr-4 text-sm font-medium transition-colors duration-200";
const idle = "border-line bg-white text-ink hover:border-brand/40 hover:bg-brand-50";
const selected = "border-brand bg-brand text-white";

/**
 * Horizontally scrolling category pills; plain links, so they work without JavaScript.
 * The list is `relative` so the sr-only (absolute) count text is clipped with it; otherwise it
 * escapes the scroll area and widens the page on phones.
 */
export function CategoryChips({ categories, active, hrefFor }: CategoryChipsProps) {
  const visible = categories.filter((c) => (c.productCount ?? 0) > 0 || c.slug === active);
  if (!visible.length) return null;
  const total = categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

  return (
    <nav aria-label="Categories" className="-mx-4 sm:-mx-6 lg:mx-0">
      <ul className="relative flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link href={hrefFor("")} scroll={false} aria-current={active === "" ? "page" : undefined} className={cn(chip, active === "" ? selected : idle)}>
            <span className={cn("flex size-8 items-center justify-center rounded-full", active === "" ? "bg-white/15" : "bg-brand-50 text-brand")}>
              <FiGrid className="size-4" aria-hidden="true" />
            </span>
            All
            <Count value={total} selected={active === ""} />
          </Link>
        </li>
        {visible.map((category) => {
          const isActive = category.slug === active;
          return (
            <li key={category.id} className="shrink-0">
              <Link href={hrefFor(category.slug)} scroll={false} aria-current={isActive ? "page" : undefined} className={cn(chip, isActive ? selected : idle)}>
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-cream-200">
                  {category.image && <Image src={category.image.url} alt="" fill sizes="32px" className="object-cover" />}
                </span>
                <span className="whitespace-nowrap">{category.name}</span>
                <Count value={category.productCount ?? 0} selected={isActive} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Count({ value, selected }: { value: number; selected: boolean }) {
  return (
    <span className={cn("rounded-full px-1.5 text-xs tabular-nums", selected ? "bg-white/15 text-white" : "bg-cream-200 text-muted")}>
      <span className="sr-only">(</span>
      {value}
      <span className="sr-only"> products)</span>
    </span>
  );
}
