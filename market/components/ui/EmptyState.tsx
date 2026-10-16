import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <div className="mt-1.5 max-w-md text-sm text-muted">{description}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
