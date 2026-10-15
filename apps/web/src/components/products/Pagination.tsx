import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the URL for a page number. */
  hrefFor: (page: number) => string;
}

function pageWindow(page: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;
  const base = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(base, "border-line bg-white hover:border-brand")} aria-label="Previous page">
          <FiChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(base, "border-line bg-white opacity-40")} aria-hidden="true">
          <FiChevronLeft className="size-4" />
        </span>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(base, p === page ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand")}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(base, "border-line bg-white hover:border-brand")} aria-label="Next page">
          <FiChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(base, "border-line bg-white opacity-40")} aria-hidden="true">
          <FiChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
