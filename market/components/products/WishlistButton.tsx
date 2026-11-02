"use client";

import { useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";
import { toast } from "@/components/ui/Toast";
import { toggleWishlist, useWishlistIds } from "@/hooks/useWishlist";

export function WishlistButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const saved = useWishlistIds().includes(id);
  function toggle() {
    try {
      const nowSaved = toggleWishlist(id);
      if (nowSaved) toast.success(`${name} saved to your wishlist`, { action: { label: "View wishlist", onClick: () => router.push("/wishlist") } });
      else toast.success(`${name} removed from your wishlist`);
    } catch { toast.error("Your wishlist could not be saved on this device."); }
  }
  return <button type="button" onClick={toggle} aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} wishlist`} title="Wishlist saved on this device" className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full border border-line bg-white/95 text-brand shadow-sm transition-colors hover:bg-brand-50"><FiHeart className={`size-[18px] ${saved ? "fill-brand" : ""}`} aria-hidden="true" /></button>;
}
