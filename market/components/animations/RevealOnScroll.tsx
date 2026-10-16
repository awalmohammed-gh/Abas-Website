"use client";

import { createElement, type ReactNode } from "react";
import { useReveal, type RevealOptions } from "./useReveal";

type Tag = "div" | "section" | "ul" | "header";

/**
 * Fades its content up once when it scrolls into view. Server-rendered
 * children stay server components; only this wrapper runs on the client.
 */
export function RevealOnScroll({ as = "div", className, children, ...options }: { as?: Tag; className?: string; children: ReactNode } & RevealOptions) {
  const scope = useReveal<HTMLElement>(options);
  return createElement(as, { ref: scope, className, "data-reveal": "" }, children);
}
