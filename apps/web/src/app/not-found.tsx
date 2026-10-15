import Link from "next/link";
import { BrandMark } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Link href="/" aria-label="ABA Mart home">
        <BrandMark className="size-14" />
      </Link>
      <p className="mt-8 font-display text-6xl font-bold text-brand">404</p>
      <h1 className="mt-3 text-2xl font-bold text-ink">This page isn&apos;t on our shelves</h1>
      <p className="mt-2 max-w-md text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/shop">Browse products</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
    </main>
  );
}
