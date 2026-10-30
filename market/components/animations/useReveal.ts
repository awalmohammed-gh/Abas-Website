"use client";

import { useEffect } from "react";
import { useAnimate } from "motion/react-mini";
import { DURATION, EASE_OUT, MAX_STAGGERED, REVEAL_OFFSET, STAGGER } from "./tokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export interface RevealOptions {
  /** CSS selector (relative to the container) for items to reveal one after another. Omit to reveal the container itself. */
  items?: string;
  /** Seconds between items. */
  stagger?: number;
  duration?: number;
  offset?: number;
}

/**
 * Fades content up as it scrolls into view. Uses Motion's mini `animate`
 * (a few KB on top of the browser's Web Animations API) and one
 * IntersectionObserver per section; only opacity and translate change, so it
 * runs on the compositor.
 *
 * Progressive by design: the server renders everything visible. The
 * observer's first report (computed by the browser, no forced layout) decides:
 * content already on screen is left alone; content still below the viewport
 * is hidden and revealed when it scrolls in. Nothing on screen flickers, and
 * content stays visible if JavaScript is slow or fails. Reduced motion: no-op.
 */
export function useReveal<T extends HTMLElement>({ items, stagger = STAGGER, duration = DURATION.reveal, offset = REVEAL_OFFSET }: RevealOptions = {}) {
  const [scope, animate] = useAnimate<T>();
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = scope.current;
    if (!root || reduceMotion || typeof IntersectionObserver === "undefined") return;

    const hidden = `0 ${offset}px`;
    let targets: HTMLElement[] = [];
    let state: "pending" | "waiting" | "done" = "pending";
    const clear = () =>
      targets.forEach((el) => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("translate");
      });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (state === "pending") {
          // First report: only content entirely below the viewport gets hidden.
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            state = "done";
            observer.disconnect();
            return;
          }
          targets = items ? Array.from(root.querySelectorAll<HTMLElement>(items)).slice(0, MAX_STAGGERED) : [root];
          // Empty grids have no children to animate (for example, a new catalogue).
          if (!targets.length) {
            state = "done";
            observer.disconnect();
            return;
          }
          targets.forEach((el) => {
            el.style.opacity = "0";
            el.style.translate = hidden;
          });
          state = "waiting";
          return;
        }
        if (state === "waiting" && entry.isIntersecting) {
          state = "done";
          observer.disconnect();
          const connectedTargets = targets.filter((el) => el.isConnected && root.contains(el));
          if (!connectedTargets.length) {
            clear();
            return;
          }
          try {
            animate(connectedTargets, { opacity: [0, 1], translate: [hidden, "0 0"] }, { duration, ease: EASE_OUT, delay: (i: number) => i * stagger })
              // Hand control back to the stylesheet (hover effects also use `translate`).
              .then(clear, clear);
          } catch {
            // Decoration must never leave content hidden or interrupt the page.
            clear();
          }
        }
      },
      // Reveal once the top edge is a little way into the viewport.
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(root);
    return () => {
      state = "done";
      observer.disconnect();
      clear();
    };
  }, [scope, animate, reduceMotion, items, stagger, duration, offset]);

  return scope;
}
