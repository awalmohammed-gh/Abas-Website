"use client";

import { usePathname } from "next/navigation";
import { FiDownload } from "react-icons/fi";
import { usePwaInstall } from "@/components/layout/PwaInstallProvider";
import { isAdminPath } from "@/lib/pwa";
import { cn } from "@/lib/utils";

export interface InstallPwaButtonProps {
  variant?: "navbar" | "mobile" | "admin-header" | "login-card" | "inline";
  className?: string;
  onInstalled?: () => void;
}

export function InstallPwaButton({ variant = "inline", className, onInstalled }: InstallPwaButtonProps) {
  const pathname = usePathname();
  const app = isAdminPath(pathname) ? "admin" : "store";
  const { standalone, installedApp, iosSafari, canPrompt, install } = usePwaInstall();
  if (standalone || installedApp === app) return null;
  if (!iosSafari && !canPrompt(app) && variant !== "mobile" && variant !== "login-card") return null;

  const label = app === "admin" ? "Download Admin App" : "Install ABA Mart App";
  const variants = {
    navbar: "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-brand/20 bg-brand-50 px-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white sm:px-3",
    mobile: "flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-brand/20 bg-brand-50 px-3 py-3 text-sm font-semibold text-brand hover:bg-brand hover:text-white",
    "admin-header": "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-500 hover:text-white",
    "login-card": "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-cream/50 px-3 py-2.5 text-xs font-semibold text-ink hover:bg-cream hover:text-brand",
    inline: "inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep",
  };

  const button = (
    <button type="button" aria-label={label} title={label} onClick={() => { void install(app).then((accepted) => { if (accepted) onInstalled?.(); }); }} className={cn("transition-colors", variants[variant], className)}>
      <FiDownload className="size-4 shrink-0" aria-hidden="true" />
      <span className={variant === "navbar" ? "hidden sm:inline" : undefined}>{variant === "navbar" ? "Install App" : label}</span>
      {variant === "navbar" && <span className="sr-only sm:hidden">{label}</span>}
    </button>
  );

  if (variant === "login-card") return <div className="mt-4 border-t border-line/60 pt-4 text-center">{button}<p className="mt-1 text-[11px] text-muted">Add the dedicated staff app to your Home Screen.</p></div>;
  return button;
}
