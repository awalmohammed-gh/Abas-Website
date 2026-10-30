import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}

/** Fills its (relatively positioned, fixed-ratio) parent. Falls back to a branded placeholder. */
export function ProductImage({ src, alt, sizes, priority, className, fit = "cover" }: ProductImageProps) {
  return (
    <Image
      src={src || "/images/placeholders/product.svg"}
      alt={src ? alt : ""}
      fill
      sizes={sizes}
      priority={priority}
      className={cn(fit === "contain" || !src ? "object-contain" : "object-cover", className)}
    />
  );
}
