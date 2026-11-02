import type { Metadata } from "next";
import { WishlistView } from "@/components/products/WishlistView";

export const metadata: Metadata = {
  title: "My wishlist",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <div className="mart-shop container-page pt-2 pb-6 sm:pb-10">
      <header className="shop-hero">
        <div className="shop-hero-copy">
          <h1>My Wishlist</h1>
          <p>Items you&apos;ve saved on this device.</p>
        </div>
      </header>
      <WishlistView />
    </div>
  );
}
