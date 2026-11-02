"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/animations/usePrefersReducedMotion";

export interface HeroSlide {
  id: string;
  title: string;
  image: string;
  alt: string;
  href: string;
}

/** Sliding product artwork. Hover, keyboard focus and background tabs suspend rotation. */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [position, setPosition] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const reduceMotion = usePrefersReducedMotion();
  const count = slides.length;
  const active = count ? position % count : 0;

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (count < 2 || reduceMotion || hovered || focused || !visible || resetting) return;
    const timer = window.setTimeout(() => setPosition(value => (value + 1) % (count + 1)), 6000);
    return () => window.clearTimeout(timer);
  }, [position, count, reduceMotion, hovered, focused, visible, resetting]);

  useEffect(() => {
    if (!resetting) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setResetting(false));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [resetting]);

  if (!count) return null;
  const frames = count > 1 ? [...slides, slides[0]] : slides;
  return (
    <div className="mart-hero-photo mart-product-slideshow" role="region" aria-roledescription="carousel" aria-label="ABA collections"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="mart-slide-track" style={{ transform: `translateX(-${position * 100}%)`, transition: resetting || reduceMotion ? "none" : undefined }}
        onTransitionEnd={event => {
          if (event.target === event.currentTarget && position === count) {
            setResetting(true);
            setPosition(0);
          }
        }}>
        {frames.map((slide, index) => {
          const duplicate = index === count;
          const shown = index === position;
          return <div key={`${slide.id}-${index}`} className="mart-product-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}: ${slide.title}`} aria-hidden={!shown || duplicate} inert={!shown || duplicate}>
            <Link href={slide.href} className="absolute inset-0 block" tabIndex={shown && !duplicate ? 0 : -1} aria-label={`Shop ${slide.title}`}>
              {/* The looping copy shares the first slide's URL, so it must not be lazy either or Next flags the LCP image. */}
              <Image src={slide.image} alt={slide.alt} fill preload={index === 0} loading={duplicate ? "eager" : undefined} sizes="(min-width: 1024px) 620px, (min-width: 640px) 50vw, 100vw" className="object-contain" />
            </Link>
          </div>;
        })}
      </div>
      <div className="mart-slide-label" aria-live="off">{slides[active].title}</div>
      {count > 1 && <div className="mart-slide-dots" aria-label="Choose a collection">{slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`Show ${slide.title}`} aria-current={index === active ? "true" : undefined} onClick={() => { setResetting(false); setPosition(index); }}><span /></button>)}</div>}
    </div>
  );
}
