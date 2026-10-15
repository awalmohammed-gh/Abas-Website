"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { BannerDTO } from "@aba-mart/shared";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const INTERVAL = 6500;

export type HeroBanner = Pick<BannerDTO, "id" | "title" | "description" | "desktopImage" | "mobileImage" | "buttonText" | "buttonLink"> & {
  eyebrow?: string;
};

/** Art-directed banner: one <picture> so phones only download the mobile crop. */
function BannerPicture({ banner, priority }: { banner: HeroBanner; priority: boolean }) {
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
      <img {...mobile} className="absolute right-0 top-0 h-auto w-full object-cover md:h-full md:w-3/4" />
    </picture>
  );
}

export function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => window.clearInterval(timer);
  }, [count]);

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative overflow-hidden bg-brand-deep"
    >
      {/* Reserve space for the photo and readable overlay at every screen size. */}
      <div className="relative grid min-h-[640px] sm:min-h-[760px] md:min-h-[clamp(440px,40vw,620px)]">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={cn("relative col-start-1 row-start-1 min-w-0 transition-opacity duration-700 motion-reduce:transition-none", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            <BannerPicture banner={banner} priority={i === 0} />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,#10382d_0%,#10382d_40%,transparent_72%)] md:bg-[linear-gradient(to_right,#10382d_0%,#10382d_25%,rgba(16,56,45,0.94)_33%,rgba(16,56,45,0.35)_53%,transparent_72%)]" aria-hidden="true" />
            <div className="container-page relative flex h-full min-h-[640px] items-end pb-20 pt-[60vw] sm:min-h-[760px] md:min-h-[clamp(440px,40vw,620px)] md:items-center md:pb-20 md:pt-10">
              <div className="min-w-0 max-w-lg text-cream md:max-w-[44%] lg:max-w-[40%]">
                {banner.eyebrow && <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent sm:text-sm">{banner.eyebrow}</p>}
                {i === 0 ? (
                  <h1 className="text-4xl font-bold leading-[1.08] sm:text-5xl md:text-4xl lg:text-5xl xl:text-6xl">{banner.title}</h1>
                ) : (
                  <h2 className="text-4xl font-bold leading-[1.08] sm:text-5xl md:text-4xl lg:text-5xl xl:text-6xl">{banner.title}</h2>
                )}
                {banner.description && <p className="mt-4 max-w-md text-base leading-relaxed text-cream/85 sm:text-lg">{banner.description}</p>}
                {banner.buttonText && banner.buttonLink && (
                  <Link
                    href={banner.buttonLink}
                    tabIndex={i === index ? 0 : -1}
                    className={buttonClasses("accent", "lg", "mt-6")}
                  >
                    {banner.buttonText} <FiArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute bottom-4 right-16 flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30"
            aria-label="Previous slide"
          >
            <FiChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute bottom-4 right-3 flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30"
            aria-label="Next slide"
          >
            <FiChevronRight className="size-6" />
          </button>
          <div className="absolute bottom-4 left-3 right-32 flex h-11 items-center overflow-x-auto">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                className="flex size-8 shrink-0 items-center justify-center"
              >
                <span className={cn("h-2 rounded-full transition-all", i === index ? "w-7 bg-accent" : "w-2 bg-white/60 hover:bg-white")} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
