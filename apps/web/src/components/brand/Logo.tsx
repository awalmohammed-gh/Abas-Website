import Image from "next/image";
import type { ImageAsset } from "@aba-mart/shared";
import { cn } from "@/lib/utils";

/** The ABA Mart mark: an "A" rising like a market canopy, with a warm accent at its heart. */
export function BrandMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={inverted ? "#FAF8F3" : "#174C3C"} />
      <path
        d="M18 47 32 15l14 32"
        fill="none"
        stroke={inverted ? "#174C3C" : "#FAF8F3"}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="37" r="4.5" fill="#E89B36" />
    </svg>
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
 * Wordmark with the brand mark. If an admin uploads a logo in Settings it is
 * used instead, so branding can change without touching code.
 */
export function Logo({ storeName = "ABA Mart", logo, tone = "light", className, showTagline = false }: LogoProps) {
  if (logo) {
    return (
      <span className={cn("relative inline-flex h-10 items-center", className)}>
        <Image
          src={logo.url}
          alt={storeName}
          width={logo.width ?? 160}
          height={logo.height ?? 40}
          className="h-10 w-auto max-w-[180px] object-contain"
          priority
        />
      </span>
    );
  }

  const [first, ...rest] = storeName.trim().split(/\s+/);
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className="size-9" inverted={tone === "dark"} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[1.35rem] font-bold tracking-tight", tone === "dark" ? "text-cream" : "text-brand")}>
          {first}
          {rest.length > 0 && (
            <span className={cn("ml-1 font-medium", tone === "dark" ? "text-accent" : "text-ink")}>{rest.join(" ")}</span>
          )}
        </span>
        {showTagline && (
          <span className={cn("mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]", tone === "dark" ? "text-cream/70" : "text-muted")}>
            Everyday essentials
          </span>
        )}
      </span>
    </span>
  );
}
