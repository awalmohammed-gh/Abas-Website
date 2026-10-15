import Image from "next/image";
import type { ImageAsset } from "@aba-mart/shared";
import { cn } from "@/lib/utils";

/** Supplied ABA Mart artwork, also used for compact brand placeholders. */
export function BrandMark({ className }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} aria-hidden="true">
      <Image src="/images/brand/aba-mart-logo-transparent.png" alt="" fill sizes="64px" className="object-contain" />
    </span>
  );
}

interface LogoProps {
  storeName?: string;
  logo?: ImageAsset | null;
  /** "dark" is for use on deep green backgrounds. */
  tone?: "light" | "dark";
  className?: string;
  showTagline?: boolean;
}

/**
 * Supplied artwork is the default; future admin uploads can override it.
 * Transparent artwork blends into the navbar, footer and admin backgrounds.
 */
export function Logo({ storeName = "ABA Mart", logo, tone = "light", className, showTagline = false }: LogoProps) {
  if (logo) {
    return (
      <span className={cn("relative inline-flex h-10 min-w-0 max-w-full items-center", className)}>
        <Image
          src={logo.url}
          alt={storeName}
          width={logo.width ?? 160}
          height={logo.height ?? 40}
          className="h-10 w-auto max-w-full object-contain"
          priority
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex shrink-0 flex-col", className)}>
      <span className="relative block h-12 w-[72px] lg:h-14 lg:w-[84px]">
        <Image src="/images/brand/aba-mart-logo-transparent.png" alt={storeName} fill sizes="(min-width: 1024px) 84px, 72px" priority className="object-contain" />
      </span>
      {showTagline && <span className={cn("mt-2 text-[10px] font-semibold uppercase tracking-[0.12em]", tone === "dark" ? "text-cream/70" : "text-muted")}>Everyday essentials</span>}
    </span>
  );
}
