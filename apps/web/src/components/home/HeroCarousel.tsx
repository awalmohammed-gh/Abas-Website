"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { BannerDTO } from "@aba-mart/shared";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const INTERVAL = 6500;

/** Art-directed banner: one <picture> so phones only download the mobile crop. */
function BannerPicture({ banner, priority }: { banner: BannerDTO; priority: boolean }) {
  const common = { alt: banner.title, priority, sizes: "100vw", quality: 75 } as const;
  const desktop = getImageProps({ ...common, src: banner.desktopImage.url, width: 1920, height: 720 }).props;
  const mobile = getImageProps({ ...common, src: (banner.mobileImage ?? banner.desktopImage).url, width: 1080, height: 1080 }).props;
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} />
      <source media="(max-width: 767px)" srcSet={mobile.srcSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img {...mobile} className="absolute inset-0 size-full object-cover" />
    </picture>
  );
}

export function HeroCarousel({ banners }: { banners: BannerDTO[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative overflow-hidden bg-brand-deep"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Fixed aspect ratios reserve space and prevent layout shift. */}
      <div className="relative aspect-square sm:aspect-[16/8] md:aspect-[8/3]">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            className={cn("absolute inset-0 transition-opacity duration-700", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            <BannerPicture banner={banner} priority={i === 0} />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/85 via-brand-deep/35 to-transparent md:bg-gradient-to-r md:from-brand-deep/80 md:via-brand-deep/35" />
            <div className="container-page relative flex h-full items-end pb-12 md:items-center md:pb-0">
              <div className="max-w-xl text-cream">
                {i === 0 ? (
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{banner.title}</h1>
                ) : (
                  <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{banner.title}</h2>
                )}
                {banner.description && <p className="mt-3 text-base text-cream/85 sm:text-lg">{banner.description}</p>}
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
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 md:flex"
            aria-label="Previous slide"
          >
            <FiChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 md:flex"
            aria-label="Next slide"
          >
            <FiChevronRight className="size-6" />
          </button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-7 bg-accent" : "w-2 bg-white/60 hover:bg-white")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
