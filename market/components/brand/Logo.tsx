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
  const tagline = showTagline && <span className={cn("mt-2 text-[10px] font-semibold uppercase tracking-[0.12em]", tone === "dark" ? "text-cream/70" : "text-muted")}>Everyday essentials</span>;

  if (logo) {
    // Same height as the supplied artwork, so an uploaded logo keeps the header layout.
    return (
      <span className={cn("inline-flex min-w-0 max-w-full shrink-0 flex-col", className)}>
        <Image
          src={logo.url}
          alt={storeName}
          width={logo.width ?? 160}
          height={logo.height ?? 40}
          sizes="(min-width: 1024px) 168px, 144px"
          className="h-12 w-auto max-w-full object-contain lg:h-14"
          priority
        />
        {tagline}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex shrink-0 flex-col", className)}>
      <span className="relative block h-12 w-[72px] lg:h-14 lg:w-[84px]">
        <Image src="/images/brand/aba-mart-logo-transparent.png" alt={storeName} fill sizes="(min-width: 1024px) 84px, 72px" priority className="object-contain" />
      </span>
      {tagline}
    </span>
  );
}
