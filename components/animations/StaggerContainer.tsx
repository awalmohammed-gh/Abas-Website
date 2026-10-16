"use client";

import type { ReactNode } from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import { STAGGER } from "./tokens";

/**
 * Reveals its items one after another (a short stagger) when the group
 * scrolls into view. By default the items are its direct children; pass
 * `items` to target nested elements, e.g. ":scope > ul > li".
 */
export function StaggerContainer({
  as = "div",
  items = ":scope > *",
  stagger = STAGGER,
  className,
  children,
}: {
  as?: "div" | "ul";
  items?: string;
  stagger?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RevealOnScroll as={as} items={items} stagger={stagger} className={className}>
      {children}
    </RevealOnScroll>
  );
}
