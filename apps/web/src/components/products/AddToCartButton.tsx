"use client";

import { useRef, useState } from "react";
import { FiCheck, FiShoppingBag } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import type { CartLineInput } from "@/types/cart";

interface AddToCartButtonProps {
  line: CartLineInput;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function AddToCartButton({ line, quantity = 1, disabled, className, size = "sm", label = "Add to cart" }: AddToCartButtonProps) {
  const { addItem, lines } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const inCart = lines.find((l) => l.productId === line.productId && l.variantId === line.variantId)?.quantity ?? 0;
  const atLimit = inCart >= line.maxQuantity;

  function handleClick() {
    addItem(line, quantity);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      <Button
        size={size}
        onClick={handleClick}
        disabled={disabled || atLimit}
        className={cn("w-full", className)}
        leftIcon={added ? <FiCheck className="size-4" aria-hidden="true" /> : <FiShoppingBag className="size-4" aria-hidden="true" />}
        title={atLimit && !disabled ? "You already have all available stock in your cart" : undefined}
      >
        {added ? "Added" : atLimit && !disabled ? "Max in cart" : label}
      </Button>
      <span className="sr-only" aria-live="polite">
        {added ? `${line.name} added to your cart` : ""}
      </span>
    </>
  );
}
