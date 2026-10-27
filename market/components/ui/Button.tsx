import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp" | "accent" | "hero" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep shadow-sm",
  secondary: "bg-white text-ink border border-line hover:border-brand/40 hover:bg-brand-50",
  ghost: "text-ink hover:bg-brand-50",
  danger: "bg-danger text-white hover:bg-danger/90",
  whatsapp: "bg-whatsapp text-white hover:bg-[#0e7a40] shadow-sm",
  accent: "bg-accent text-brand-deep hover:bg-[#dd8d26] shadow-sm",
  hero: "bg-accent text-white hover:bg-accent-700 shadow-sm [text-shadow:0_1px_2px_rgb(16_56_45_/_0.55)]",
  link: "text-brand underline-offset-4 hover:underline px-0",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 py-2 text-sm gap-1.5 rounded-lg",
  md: "min-h-11 px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "min-h-12 px-6 py-2.5 text-base gap-2 rounded-xl",
  icon: "size-10 rounded-xl",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex min-w-0 max-w-full shrink-0 items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] font-semibold transition-[color,background-color,border-color,scale] duration-150 ease-out motion-safe:active:scale-[0.98] [&>svg]:shrink-0",
    "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
    variants[variant],
    variant === "link" ? "h-auto text-sm" : sizes[size],
    className,
  );
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="-ml-0.5" label="Working" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  leftIcon,
  rightIcon,
  className,
  children,
  href,
  external = false,
  ...props
}: Omit<CommonProps, "loading"> & Omit<ComponentProps<typeof Link>, "href"> & { href: string; external?: boolean }) {
  const classes = buttonClasses(variant, size, className);
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...(props as ComponentProps<"a">)}>
        {leftIcon}
        {children}
        {rightIcon}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
