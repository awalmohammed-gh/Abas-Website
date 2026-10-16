"use client";

import Link from "next/link";
import { FiAlertTriangle } from "react-icons/fi";
import { Button, buttonClasses } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-50 text-2xl text-danger">
        <FiAlertTriangle aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted">We couldn&apos;t load this page. Please try again — if it keeps happening, contact us on WhatsApp.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClasses("secondary")}>
          Go home
        </Link>
      </div>
    </div>
  );
}
