"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { FiDownload, FiPlusSquare, FiShare, FiSmartphone, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallPwaButtonProps {
  variant?: "navbar" | "mobile" | "admin-header" | "login-card" | "inline";
  className?: string;
  onInstalled?: () => void;
}

const emptySubscribe = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function useIsStandalone(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia("(display-mode: standalone)");
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => {
      const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const isStandaloneNavigator = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      return Boolean(isStandaloneMedia || isStandaloneNavigator);
    },
    () => false
  );
}

function useIsAppleDevice(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    },
    () => false
  );
}

export function InstallPwaButton({ variant = "inline", className, onInstalled }: InstallPwaButtonProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  const isClient = useIsClient();
  const isStandalone = useIsStandalone();
  const isIos = useIsAppleDevice();

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      onInstalled?.();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [onInstalled]);

  // If already running standalone or SSR, do not render
  if (!isClient || isStandalone) {
    return null;
  }

  // If beforeinstallprompt hasn't fired and not iOS, we still render a fallback button on login-card and mobile menu
  const canPrompt = Boolean(installPrompt);
  const canShow = canPrompt || isIos || variant === "login-card" || variant === "mobile";

  if (!canShow) {
    return null;
  }

  const appTitle = isAdmin ? "ABA Admin" : "ABA Mart";
  const buttonLabel = isAdmin ? "Install Admin App" : "Install ABA Mart App";

  async function handleInstallClick() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
          onInstalled?.();
        }
      } catch {
        // Fallback to instructions modal if prompt fails
        setShowIosModal(true);
      }
    } else {
      // iOS or browsers without direct prompt event: show guided modal
      setShowIosModal(true);
    }
  }

  return (
    <>
      {variant === "navbar" && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={cn(
            "hidden h-9 items-center gap-1.5 rounded-xl border border-brand/20 bg-brand-50 px-3 text-xs font-semibold text-brand transition-all hover:bg-brand hover:text-white sm:inline-flex",
            className
          )}
          title={`Install ${appTitle} on your device`}
          aria-label={`Install ${appTitle} App`}
        >
          <FiDownload className="size-3.5" aria-hidden="true" />
          <span>Install App</span>
        </button>
      )}

      {variant === "mobile" && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={cn(
            "flex w-full items-center justify-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50/70 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white",
            className
          )}
        >
          <FiDownload className="size-4" aria-hidden="true" />
          <span>{buttonLabel}</span>
        </button>
      )}

      {variant === "admin-header" && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500 hover:text-white dark:text-amber-300",
            className
          )}
          title="Install dedicated ABA Mart Admin app"
          aria-label="Install Admin App"
        >
          <FiDownload className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Install Admin App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {variant === "login-card" && (
        <div className={cn("mt-4 border-t border-line/60 pt-4 text-center", className)}>
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-cream/50 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-cream hover:text-brand"
          >
            <FiSmartphone className="size-4 text-brand" aria-hidden="true" />
            <span>Install Dedicated Admin App</span>
          </button>
          <p className="mt-1 text-[11px] text-muted">Install on your phone or PC home screen for fast one-tap access.</p>
        </div>
      )}

      {variant === "inline" && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90",
            className
          )}
        >
          <FiDownload className="size-4" aria-hidden="true" />
          <span>{buttonLabel}</span>
        </button>
      )}

      {/* iOS Safari & Fallback Install Guide Modal */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-cream hover:text-ink"
              aria-label="Close"
            >
              <FiX className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-cream">
                <FiSmartphone className="size-6" />
              </div>
              <div>
                <h3 id="pwa-install-title" className="font-display text-base font-bold text-ink">
                  Install {appTitle}
                </h3>
                <p className="text-xs text-muted">
                  {isAdmin ? "Dedicated Admin Portal" : "Customer Storefront"}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5 text-sm text-ink/80">
              <p className="text-xs text-muted">
                Follow these simple steps in Safari to add {appTitle} to your home screen:
              </p>

              <div className="flex items-start gap-3 rounded-xl bg-cream/60 p-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-brand">
                  <FiShare className="size-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-ink">Step 1:</span> Tap the{" "}
                  <strong className="text-ink">Share</strong> button in Safari&apos;s toolbar (bottom on iPhone, top on iPad).
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-cream/60 p-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-brand">
                  <FiPlusSquare className="size-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-ink">Step 2:</span> Scroll down and tap{" "}
                  <strong className="text-ink">Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-cream/60 p-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-brand font-bold text-xs">
                  Add
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-ink">Step 3:</span> Tap{" "}
                  <strong className="text-ink">Add</strong> in the top right corner.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="mt-6 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
