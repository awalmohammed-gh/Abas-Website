"use client";

import { useRef, useState } from "react";
import { FiCheck, FiShoppingBag } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
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
}

export function AddToCartButton({ line, quantity = 1, disabled, className, size = "sm", label = "Add to cart" }: AddToCartButtonProps) {
  const { addItem, lines, hydrated, pending } = useCart();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const inCart = lines.find((l) => l.productId === line.productId && l.variantId === line.variantId)?.quantity ?? 0;
  const atLimit = inCart >= line.maxQuantity;

  async function handleClick() {
    setError(null);
    try {
      await addItem(line, quantity);
      setAdded(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAdded(false), 1800);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <>
      <Button
        size={size}
        onClick={handleClick}
        disabled={disabled || atLimit || !hydrated || pending}
        className={cn("w-full", className)}
        leftIcon={added ? <FiCheck className="size-4" aria-hidden="true" /> : <FiShoppingBag className="size-4" aria-hidden="true" />}
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
