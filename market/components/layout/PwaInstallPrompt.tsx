"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { FiDownload, FiX } from "react-icons/fi";
import { usePwaInstall } from "./PwaInstallProvider";
import { type PwaApp } from "@/lib/pwa";
import { cn } from "@/lib/utils";

/** A site invitation, not an automatic browser permission or installation request. */
export function PwaInstallPrompt({ app }: { app: PwaApp }) {
  const { standalone, iosSafari, installedApp, guideOpen, canPrompt, install } = usePwaInstall();
  const [due, setDue] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);
  const titleId = useId();
  const key = `aba:install-invite:${app}`;
  const eligible = !standalone && installedApp !== app && (iosSafari || canPrompt(app));

  useEffect(() => {
    if (!eligible) return;
    try { if (sessionStorage.getItem(key)) return; } catch { /* Private storage may be unavailable. */ }
    const timer = window.setTimeout(() => setDue(true), 1800);
    return () => window.clearTimeout(timer);
  }, [eligible, key]);

  if ((!eligible && !opening) || !due || dismissed || guideOpen) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(key, "1"); } catch { /* Keep the invitation dismissed in memory. */ }
  };

  const download = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await install(app);
    } finally {
      setOpening(false);
    }
  };

  // Mount outside the streamed layout and its stacking/event layers. `due` is
  // set only after hydration, so document.body is never accessed on the server.
  return createPortal(
    <aside data-pwa-install-prompt aria-labelledby={titleId} className={cn(
      "pointer-events-auto fixed inset-x-3 z-[60] isolate mx-auto max-w-sm rounded-2xl border border-brand/15 bg-white p-4 shadow-pop sm:inset-x-auto sm:left-5 sm:mx-0",
      app === "store" ? "bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-5" : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
    )}>
      <button type="button" onClick={dismiss} aria-label="Dismiss install invitation" className="absolute right-1 top-1 z-10 flex size-10 touch-manipulation items-center justify-center rounded-xl text-muted hover:bg-cream"><FiX className="size-4" aria-hidden="true" /></button>
      <div className="flex gap-3 pr-6"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand"><FiDownload className="size-5" aria-hidden="true" /></span><div><h2 id={titleId} className="text-sm font-semibold text-ink">{app === "admin" ? "Install ABA Mart Admin App" : "Install ABA Mart App"}</h2><p className="mt-1 text-xs leading-relaxed text-muted">{app === "admin" ? "Open your staff portal straight from your Home Screen." : "Keep the store and your orders one tap away."}</p></div></div>
      <div className="relative mt-4 flex items-center gap-3"><button type="button" onClick={() => void download()} disabled={opening} aria-busy={opening} className="min-h-11 flex-1 touch-manipulation rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-wait disabled:opacity-70">{opening ? "Opening installer…" : app === "admin" ? "Download Admin App" : "Download App"}</button><button type="button" onClick={dismiss} className="min-h-11 touch-manipulation px-2 text-xs font-semibold text-muted hover:text-brand">Not now</button></div>
    </aside>,
    document.body,
  );
}
