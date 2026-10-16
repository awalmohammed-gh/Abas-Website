"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FiCheck, FiPlus, FiShoppingBag } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import type { CartLineInput } from "@/types/cart";
import { errorMessage } from "@/lib/api";

interface AddToCartButtonProps {
  line: CartLineInput;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  /** Round icon-only "quick add" for product cards; confirms with a toast instead of inline text. */
  compact?: boolean;
}

export function AddToCartButton({ line, quantity = 1, disabled, className, size = "sm", label = "Add to cart", compact = false }: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem, lines, hydrated, pending } = useCart();
  const [added, setAdded] = useState(false);
  // Shows a spinner the moment the button is pressed, before the server confirms.
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const inCart = lines.find((l) => l.productId === line.productId && l.variantId === line.variantId)?.quantity ?? 0;
  const atLimit = inCart >= line.maxQuantity;

  async function handleClick() {
    setError(null);
    setAdding(true);
    try {
      await addItem(line, quantity);
      setAdded(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAdded(false), 1800);
      if (compact) toast.success(`${line.name} added to your cart`, { action: { label: "View cart", onClick: () => router.push("/cart") } });
    } catch (cause) {
      if (compact) toast.error(errorMessage(cause));
      else setError(errorMessage(cause));
    } finally {
      setAdding(false);
    }
  }

  if (compact) {
    const blocked = disabled || atLimit;
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={blocked || adding || !hydrated || pending}
        aria-label={atLimit && !disabled ? `${line.name}: all available stock is in your cart` : `Add ${line.name} to cart`}
        title={atLimit && !disabled ? "All available stock is in your cart" : "Add to cart"}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full bg-white text-brand-deep shadow-pop ring-1 ring-black/5 transition-[background-color,color,scale] duration-200",
          "hover:bg-brand hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-brand-deep",
          added && "bg-brand text-white disabled:hover:bg-brand disabled:hover:text-white",
          className,
        )}
      >
        {adding ? (
          <Spinner className="text-current" label={`Adding ${line.name}`} />
        ) : added ? (
          <FiCheck className="size-5 animate-pop-in" aria-hidden="true" />
        ) : (
          <FiPlus className="size-5" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <>
      <Button
        size={size}
        onClick={handleClick}
        loading={adding}
        disabled={disabled || atLimit || !hydrated || (pending && !adding)}
        className={cn("w-full", className)}
        leftIcon={added ? <FiCheck className="size-4 animate-pop-in" aria-hidden="true" /> : <FiShoppingBag className="size-4" aria-hidden="true" />}
        title={atLimit && !disabled ? "You already have all available stock in your cart" : undefined}
      >
        {added ? "Added" : atLimit && !disabled ? "Max in cart" : label}
      </Button>
      <span className="sr-only" aria-live="polite">
        {added ? `${line.name} added to your cart` : ""}
      </span>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </>
  );
}
