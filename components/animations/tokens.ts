/**
 * Shared animation timing for the storefront. Durations are in seconds (Motion's unit).
 * CSS equivalents live in globals.css (--ease-out-soft, the hero-rise keyframes, .lift).
 */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = {
  reveal: 0.45,
  sectionReveal: 0.5,
} as const;

/** Delay between items in a staggered reveal. */
export const STAGGER = 0.06;

/** Distance revealed content travels upward, in pixels. */
export const REVEAL_OFFSET = 15;

/** Never stagger more than this many items; the rest are shown immediately. */
export const MAX_STAGGERED = 12;
