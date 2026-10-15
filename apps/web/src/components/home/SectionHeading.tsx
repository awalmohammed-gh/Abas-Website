import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowRight } from "react-icons/fi";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">{eyebrow}</p>}
        <h2 id={id} className="text-2xl font-bold text-ink sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-[15px] text-muted">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:gap-2.5 hover:underline">
          {linkLabel} <FiArrowRight className="size-4 transition-all" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
