"use client";

import { useEffect } from "react";

let locks = 0;
let previousBodyOverflow = "";
let previousRootOverflow = "";

/** Multiple menus/dialogs share the lock; the last one to close restores normal scrolling. */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    if (locks === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousRootOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousRootOverflow;
      }
    };
  }, [locked]);
}
