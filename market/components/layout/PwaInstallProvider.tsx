"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { FiArrowDown, FiDownload, FiPlusSquare, FiShare } from "react-icons/fi";
import { Modal } from "@/components/ui/Modal";
import { isAdminPath, isIosDevice, isIosSafari, isStandalone, PWA_APPS, type PwaApp } from "@/lib/pwa";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallContextValue {
  standalone: boolean;
  iosSafari: boolean;
  installedApp: PwaApp | null;
  guideOpen: boolean;
  canPrompt: (app: PwaApp) => boolean;
  install: (app: PwaApp) => Promise<boolean>;
}

const InstallContext = createContext<InstallContextValue | null>(null);
const emptySubscribe = () => () => {};
const serverSnapshot = () => false;

function subscribeDisplayMode(notify: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", notify);
  window.addEventListener("pageshow", notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("pageshow", notify);
  };
}

/** Capture beforeinstallprompt once, before async headers and their buttons mount. */
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, serverSnapshot);
  const iosSafari = useSyncExternalStore(emptySubscribe, isIosSafari, serverSnapshot);
  const iosDevice = useSyncExternalStore(emptySubscribe, isIosDevice, serverSnapshot);
  const [deferred, setDeferred] = useState<{ app: PwaApp; event: InstallEvent } | null>(null);
  const [installedApp, setInstalledApp] = useState<PwaApp | null>(null);
  const [guideApp, setGuideApp] = useState<PwaApp | null>(null);

  useEffect(() => {
    const currentApp = (): PwaApp => isAdminPath(window.location.pathname) ? "admin" : "store";
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred({ app: currentApp(), event: event as InstallEvent });
    };
    const installed = () => {
      setInstalledApp(currentApp());
      setDeferred(null);
      setGuideApp(null);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install(app: PwaApp): Promise<boolean> {
    if (standalone || installedApp === app) return false;
    if (deferred?.app === app) {
      const event = deferred.event;
      setDeferred(null); // A native install event can be used only once.
      try {
        await event.prompt();
        const accepted = (await event.userChoice).outcome === "accepted";
        if (accepted) setInstalledApp(app);
        return accepted;
      } catch {
        setGuideApp(app);
        return false;
      }
    }
    setGuideApp(app);
    return false;
  }

  const config = guideApp ? PWA_APPS[guideApp] : null;

  return (
    <InstallContext.Provider value={{ standalone, iosSafari, installedApp, guideOpen: guideApp !== null, canPrompt: (app) => deferred?.app === app, install }}>
      {children}
      <Modal
        open={guideApp !== null}
        onClose={() => setGuideApp(null)}
        title={guideApp === "admin" ? "Install ABA Mart Admin App" : "Install ABA Mart App"}
        description={iosDevice ? "Add this app to your iPhone or iPad Home Screen." : "Install this app from your browser."}
        size="sm"
      >
        {config && (
          <div className="pb-[env(safe-area-inset-bottom)]">
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-brand-50 p-3">
              {/* Static public PNGs; native img avoids adding an image loader dependency to the guide. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.icon} alt="" width={52} height={52} className="rounded-xl border border-line" />
              <div><p className="font-semibold text-ink">{config.title}</p><p className="text-xs text-muted">{guideApp === "admin" ? "Your dedicated staff portal" : "Your store, one tap away"}</p></div>
            </div>
            {iosDevice ? (
              <>
                {!iosSafari && <p className="mb-4 text-sm text-muted">Open this page in Safari, then follow these steps.</p>}
                <ol className="space-y-4 text-sm leading-relaxed text-ink">
                  <li className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-brand"><FiShare className="size-5" aria-hidden="true" /></span><p><strong>Step 1: Tap Share.</strong><br />Find the square with the upward arrow in Safari&apos;s toolbar, usually at the bottom on iPhone or at the top on iPad.</p></li>
                  <li className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-brand"><FiPlusSquare className="size-5" aria-hidden="true" /></span><p><strong>Step 2: Add to Home Screen.</strong><br />Scroll down in the Share menu and tap <strong>Add to Home Screen</strong>.</p></li>
                  <li className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white">Add</span><p><strong>Step 3: Tap Add.</strong><br />Tap <strong>Add</strong> in the top-right corner to install <strong>{config.title}</strong> directly to your Home Screen. Keep <strong>Open as Web App</strong> enabled if shown.</p></li>
                </ol>
                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-line p-3 text-xs font-semibold text-brand"><FiShare className="size-4" aria-hidden="true" /> Safari toolbar → Share → Add to Home Screen <FiArrowDown className="size-4" aria-hidden="true" /></div>
              </>
            ) : (
              <div className="flex gap-3 text-sm leading-relaxed text-muted"><FiDownload className="mt-1 size-5 shrink-0 text-brand" aria-hidden="true" /><p>Open your browser&apos;s menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>. If the option is unavailable, open this page in Chrome, Edge or Safari over HTTPS.</p></div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted">{guideApp === "admin" ? "Open the app from your Home Screen and sign in with your staff account to manage the store." : "After installation, open the app from your Home Screen. On iOS 16.4 or later, you can then enable supported notification alerts from inside the app."}</p>
            <button type="button" onClick={() => setGuideApp(null)} className="mt-5 min-h-11 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep">Got it</button>
          </div>
        )}
      </Modal>
    </InstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  return context;
}
