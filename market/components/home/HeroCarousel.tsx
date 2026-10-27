"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useAnimate } from "motion/react-mini";
import { FiArrowRight, FiCheckCircle, FiChevronLeft, FiChevronRight, FiShoppingBag } from "react-icons/fi";
import type { BannerDTO } from "@aba-mart/shared";
import { usePrefersReducedMotion } from "@/components/animations/usePrefersReducedMotion";
import { EASE_OUT } from "@/components/animations/tokens";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const INTERVAL = 8000;
const SLIDE_DURATION = 0.9;

export type HeroBanner = Pick<BannerDTO, "id" | "eyebrow" | "title" | "description" | "desktopImage" | "mobileImage" | "buttonText" | "buttonLink">;

/** Art-directed banner: one <picture> so phones only download the mobile crop. */
function BannerPicture({ banner, priority, className }: { banner: HeroBanner; priority: boolean; className?: string }) {
  const common = {
    alt: banner.desktopImage.alt || banner.title,
    loading: priority ? "eager" : "lazy",
    fetchPriority: priority ? "high" : "auto",
    sizes: "100vw",
    quality: 75,
  } as const;
  const desktop = getImageProps({ ...common, src: banner.desktopImage.url, width: banner.desktopImage.width ?? 1920, height: banner.desktopImage.height ?? 720 }).props;
  const mobileImage = banner.mobileImage ?? banner.desktopImage;
  const mobile = getImageProps({ ...common, src: mobileImage.url, width: mobileImage.width ?? 1080, height: mobileImage.height ?? 1080, alt: mobileImage.alt || common.alt }).props;
  return (
    <picture className="absolute inset-0 block h-full w-full">
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} />
      <source media="(max-width: 767px)" srcSet={mobile.srcSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img {...mobile} data-hero-image className={cn("absolute inset-0 h-full w-full object-cover", className)} />
    </picture>
  );
}

const subscribeLoad = (notify: () => void) => {
  window.addEventListener("load", notify);
  return () => window.removeEventListener("load", notify);
};
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};

/** Staggered CSS entrance for the copy of the slide being shown. */
const rise = (active: boolean, delayMs: number): { className?: string; style?: CSSProperties } =>
  active ? { className: "animate-hero-rise", style: { animationDelay: `${delayMs}ms` } } : {};

export function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const count = banners.length;
  // `seen` slides keep their image mounted; the others don't download theirs until needed.
  const [{ index, seen, direction, transitioning }, setState] = useState({ index: 0, seen: [0], direction: 1, transitioning: false });
  const previousIndex = useRef(0);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = usePrefersReducedMotion();
  const pageLoaded = useSyncExternalStore(subscribeLoad, () => document.readyState === "complete", () => false);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);

  const show = (next: number, requestedDirection?: number) =>
    setState((s) => {
      if (count < 2 || (s.transitioning && !reduceMotion)) return s;
      const i = (next + count) % count;
      if (i === s.index) return s;
      return {
        index: i,
        seen: s.seen.includes(i) ? s.seen : [...s.seen, i],
        direction: requestedDirection ?? (i > s.index ? 1 : -1),
        transitioning: !reduceMotion,
      };
    });

  // Start before paint: both slides travel together, so there is no flash or
  // empty gap between banners. The first banner stays visible during hydration.
  useLayoutEffect(() => {
    const previous = previousIndex.current;
    previousIndex.current = index;
    const root = scope.current;
    const incoming = root?.querySelector<HTMLElement>(`[data-hero-slide="${index}"]`);
    const outgoing = root?.querySelector<HTMLElement>(`[data-hero-slide="${previous}"]`);
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setState((s) => s.index === index && s.transitioning ? { ...s, transitioning: false } : s);
    };
    if (previous === index || reduceMotion || !incoming || !outgoing) {
      void Promise.resolve().then(finish);
      return () => { cancelled = true; };
    }

    const image = incoming.querySelector<HTMLElement>("[data-hero-image]");
    const clean = () => {
      for (const slide of [incoming, outgoing]) {
        slide.style.removeProperty("transform");
        slide.style.removeProperty("opacity");
        slide.style.removeProperty("will-change");
      }
      image?.style.removeProperty("transform");
    };
    incoming.style.willChange = outgoing.style.willChange = "transform, opacity";
    const enter = animate(incoming, {
      transform: [`translateX(${direction * 100}%)`, "translateX(0%)"],
      opacity: [1, 1],
    }, { duration: SLIDE_DURATION, ease: EASE_OUT });
    const exit = animate(outgoing, {
      transform: ["translateX(0%)", `translateX(${-direction * 100}%)`],
      opacity: [1, 1],
    }, { duration: SLIDE_DURATION, ease: EASE_OUT });
    const zoom = image ? animate(image, { transform: ["scale(1.035)", "scale(1)"] }, { duration: 1.3, ease: EASE_OUT }) : null;
    void Promise.all([enter, exit]).then(() => {
      if (cancelled) return;
      for (const slide of [incoming, outgoing]) {
        slide.style.removeProperty("transform");
        slide.style.removeProperty("opacity");
        slide.style.removeProperty("will-change");
      }
      finish();
    });
    return () => {
      cancelled = true;
      enter.stop();
      exit.stop();
      zoom?.stop();
      clean();
    };
  }, [index, direction, reduceMotion, scope, animate]);

  // Automatically advance every eight seconds, including after hover or touch.
  // Background tabs and reduced-motion preferences still suspend rotation.
  useEffect(() => {
    if (count < 2 || reduceMotion || !pageVisible) return;
    const timer = window.setTimeout(() => {
      setState((s) => {
        const i = (s.index + 1) % count;
        return { index: i, seen: s.seen.includes(i) ? s.seen : [...s.seen, i], direction: 1, transitioning: true };
      });
    }, INTERVAL);
    return () => window.clearTimeout(timer);
  }, [index, count, reduceMotion, pageVisible]);

  // After the page has finished loading, fetch the next slide's image in the background.
  const nextIndex = (index + 1) % count;
  const hasImage = (i: number) => seen.includes(i) || (pageLoaded && i === nextIndex);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative h-[100vh] overflow-hidden bg-brand-deep"
    >
      {/* Reserve space for the photo and readable overlay at every screen size. */}
      <div ref={scope} className="relative grid h-full min-h-0 grid-rows-[minmax(0,1fr)]">
        {banners.map((banner, i) => {
          const active = i === index;
          return (
            <div
              key={banner.id}
              data-hero-slide={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={cn("relative col-start-1 row-start-1 h-full min-h-0 min-w-0 overflow-hidden", active ? "z-10 opacity-100" : "pointer-events-none opacity-0")}
            >
              {hasImage(i) && (
                <BannerPicture
                  banner={banner}
                  priority={i === 0}
                />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,56,45,0.4)_0%,rgba(16,56,45,0.8)_50%,rgba(16,56,45,0.65)_100%)]" aria-hidden="true" />
              <div className="container-page absolute inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center py-24">
                <div className="w-full min-w-0 max-w-3xl text-center text-cream">
                  {banner.eyebrow && (
                    <p style={rise(active, 0).style} className={cn("mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cream backdrop-blur-sm sm:text-xs", rise(active, 0).className)}>
                      <FiShoppingBag className="size-3.5 text-accent" aria-hidden="true" />
                      {banner.eyebrow}
                    </p>
                  )}
                  {i === 0 ? (
                    <h1 style={rise(active, 60).style} className={cn("text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl", rise(active, 60).className)}>
                      {banner.title}
                    </h1>
                  ) : (
                    <h2 style={rise(active, 60).style} className={cn("text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl", rise(active, 60).className)}>
                      {banner.title}
                    </h2>
                  )}
                  {banner.description && (
                    <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-pretty text-cream/85 sm:text-base lg:text-lg">
                      <span className="sr-only">{banner.description}</span>
                      <span aria-hidden="true">
                        {banner.description.trim().split(/\s+/).map((word, wordIndex) => (
                          <span key={wordIndex}>
                            <span
                              className={cn("inline-block", active && "motion-safe:animate-hero-word")}
                              style={active ? { animationDelay: `${240 + Math.min(wordIndex * 22, 1400)}ms` } : undefined}
                            >
                              {word}
                            </span>{" "}
                          </span>
                        ))}
                      </span>
                    </p>
                  )}
                  {banner.buttonText && banner.buttonLink && (
                    <div style={rise(active, 220).style} className={cn("mt-7 flex flex-wrap items-center justify-center gap-3", rise(active, 220).className)}>
                      <Link href={banner.buttonLink} tabIndex={active ? 0 : -1} className={buttonClasses("hero", "lg", "group min-w-44 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white")}>
                        {banner.buttonText}
                        <FiArrowRight className="size-5 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                      <Link href="/products" tabIndex={active ? 0 : -1} className={buttonClasses("secondary", "lg", "min-w-44 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white")}>
                        Explore all products
                      </Link>
                    </div>
                  )}
                  <div style={rise(active, 300).style} className={cn("mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-cream/75 sm:text-sm", rise(active, 300).className)}>
                    <span className="inline-flex items-center gap-1.5"><FiCheckCircle className="size-4 text-accent" aria-hidden="true" /> Order on WhatsApp</span>
                    <span className="inline-flex items-center gap-1.5"><FiCheckCircle className="size-4 text-accent" aria-hidden="true" /> No account needed</span>
                  </div>
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex min-h-16 items-center gap-2 border-t border-white/15 bg-brand-deep/40 px-5 backdrop-blur-sm sm:px-8">
          <div className="mr-auto flex min-w-0 items-center overflow-x-auto">
            {banners.map((banner, i) => (
              <button key={banner.id} type="button" onClick={() => show(i)} disabled={transitioning && !reduceMotion} aria-label={`Show slide ${i + 1}: ${banner.title}`} aria-current={i === index} className="group flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-accent">
                <span className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-7 bg-accent" : "w-1.5 bg-white/50 group-hover:bg-white")} />
              </button>
            ))}
          </div>
          <span className="mr-1 shrink-0 text-xs tabular-nums text-cream/70" aria-hidden="true">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
          <button
            type="button"
            onClick={() => show(index - 1, -1)}
            disabled={transitioning && !reduceMotion}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white text-brand shadow-sm transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default"
            aria-label="Previous slide"
          >
            <FiChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => show(index + 1, 1)}
            disabled={transitioning && !reduceMotion}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white text-brand shadow-sm transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default"
            aria-label="Next slide"
          >
            <FiChevronRight className="size-6" />
          </button>
        </div>
      )}
    </section>
  );
}
