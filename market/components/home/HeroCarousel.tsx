"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useAnimate } from "motion/react-mini";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { BannerDTO } from "@aba-mart/shared";
import { usePrefersReducedMotion } from "@/components/animations/usePrefersReducedMotion";
import { EASE_OUT } from "@/components/animations/tokens";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const INTERVAL = 6500;
const SLIDE_DURATION = 0.9;

export type HeroBanner = Pick<BannerDTO, "id" | "eyebrow" | "title" | "description" | "desktopImage" | "mobileImage" | "buttonText" | "buttonLink">;

/** Art-directed banner: one <picture> so phones only download the mobile crop. */
function BannerPicture({ banner, priority, className }: { banner: HeroBanner; priority: boolean; className?: string }) {
  const common = {
    alt: banner.desktopImage.alt || banner.title,
    loading: priority ? "eager" : "lazy",
    fetchPriority: priority ? "high" : "auto",
    sizes: "(min-width: 768px) 75vw, 100vw",
    quality: 75,
  } as const;
  const desktop = getImageProps({ ...common, src: banner.desktopImage.url, width: banner.desktopImage.width ?? 1920, height: banner.desktopImage.height ?? 720 }).props;
  const mobileImage = banner.mobileImage ?? banner.desktopImage;
  const mobile = getImageProps({ ...common, src: mobileImage.url, width: mobileImage.width ?? 1080, height: mobileImage.height ?? 1080, alt: mobileImage.alt || common.alt }).props;
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} />
      <source media="(max-width: 767px)" srcSet={mobile.srcSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img {...mobile} data-hero-image className={cn("absolute right-0 top-0 h-auto w-full object-cover md:h-full md:w-3/4", className)} />
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
  const [paused, setPaused] = useState(false);
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

  // One timer per slide: restarts after manual navigation, stops while hovered,
  // focused or in a background tab, and never runs for reduced-motion users.
  useEffect(() => {
    if (count < 2 || paused || reduceMotion || !pageVisible) return;
    const timer = window.setTimeout(() => {
      setState((s) => {
        const i = (s.index + 1) % count;
        return { index: i, seen: s.seen.includes(i) ? s.seen : [...s.seen, i], direction: 1, transitioning: true };
      });
    }, INTERVAL);
    return () => window.clearTimeout(timer);
  }, [index, count, paused, reduceMotion, pageVisible]);

  // After the page has finished loading, fetch the next slide's image in the background.
  const nextIndex = (index + 1) % count;
  const hasImage = (i: number) => seen.includes(i) || (pageLoaded && i === nextIndex);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative overflow-hidden bg-brand-deep"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setPaused(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setPaused(false); }}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
    >
      {/* Reserve space for the photo and readable overlay at every screen size. */}
      <div ref={scope} className="relative grid min-h-[640px] sm:min-h-[760px] md:min-h-[clamp(440px,40vw,620px)]">
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
              className={cn("relative col-start-1 row-start-1 min-w-0 overflow-hidden", active ? "z-10 opacity-100" : "pointer-events-none opacity-0")}
            >
              {hasImage(i) && (
                <BannerPicture
                  banner={banner}
                  priority={i === 0}
                />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(to_top,#10382d_0%,#10382d_40%,transparent_72%)] md:bg-[linear-gradient(to_right,#10382d_0%,#10382d_25%,rgba(16,56,45,0.94)_33%,rgba(16,56,45,0.35)_53%,transparent_72%)]" aria-hidden="true" />
              <div className="container-page relative flex h-full min-h-[640px] items-end pb-20 pt-[60vw] sm:min-h-[760px] md:min-h-[clamp(440px,40vw,620px)] md:items-center md:pb-20 md:pt-10">
                <div className="min-w-0 max-w-lg text-cream md:max-w-[44%] lg:max-w-[40%]">
                  {banner.eyebrow && (
                    <p style={rise(active, 0).style} className={cn("mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent sm:text-sm", rise(active, 0).className)}>
                      {banner.eyebrow}
                    </p>
                  )}
                  {i === 0 ? (
                    <h1 style={rise(active, 60).style} className={cn("text-4xl font-bold leading-[1.08] sm:text-5xl md:text-4xl lg:text-5xl xl:text-6xl", rise(active, 60).className)}>
                      {banner.title}
                    </h1>
                  ) : (
                    <h2 style={rise(active, 60).style} className={cn("text-4xl font-bold leading-[1.08] sm:text-5xl md:text-4xl lg:text-5xl xl:text-6xl", rise(active, 60).className)}>
                      {banner.title}
                    </h2>
                  )}
                  {banner.description && (
                    <p style={rise(active, 140).style} className={cn("mt-4 max-w-md text-base leading-relaxed text-cream/85 sm:text-lg", rise(active, 140).className)}>
                      {banner.description}
                    </p>
                  )}
                  {banner.buttonText && banner.buttonLink && (
                    <div style={rise(active, 220).style} className={rise(active, 220).className}>
                      <Link href={banner.buttonLink} tabIndex={active ? 0 : -1} className={buttonClasses("accent", "lg", "group mt-6")}>
                        {banner.buttonText}
                        <FiArrowRight className="size-5 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => show(index - 1, -1)}
            disabled={transitioning && !reduceMotion}
            className="absolute bottom-4 right-16 z-20 flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors duration-200 hover:bg-white/30 disabled:cursor-default"
            aria-label="Previous slide"
          >
            <FiChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => show(index + 1, 1)}
            disabled={transitioning && !reduceMotion}
            className="absolute bottom-4 right-3 z-20 flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors duration-200 hover:bg-white/30 disabled:cursor-default"
            aria-label="Next slide"
          >
            <FiChevronRight className="size-6" />
          </button>
          <div className="absolute bottom-4 left-3 right-32 z-20 flex h-11 items-center overflow-x-auto">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => show(i)}
                disabled={transitioning && !reduceMotion}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                className="group flex size-8 shrink-0 items-center justify-center"
              >
                {/* Fixed-size pill scaled with transform, so the indicator never changes layout. */}
                <span
                  className={cn(
                    "h-2 w-7 rounded-full transition-[scale,background-color] duration-300 ease-out-soft",
                    i === index ? "scale-x-100 bg-accent" : "scale-x-[0.286] bg-white/60 group-hover:bg-white",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
