import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "accent" | "success" | "danger" | "warning" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-cream-200 text-ink",
  brand: "bg-brand-50 text-brand",
  accent: "bg-accent text-brand-deep",
  success: "bg-success-50 text-success",
  danger: "bg-danger-50 text-danger",
  warning: "bg-accent-50 text-accent-700",
  info: "bg-[#eef2fb] text-[#2f4a8a]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold whitespace-normal", tones[tone], className)}>
      {children}
    </span>
  );
}
