import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FiClock, FiLink } from "react-icons/fi";
import type { ApiResponse, OrderPreviewDTO } from "@aba-mart/shared";
import { Logo } from "@/components/brand/Logo";
import { OrderPreview } from "@/components/orders/OrderPreview";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMetadataSettings } from "@/lib/catalog";
import { getServerApiUrl } from "@/lib/catalogTransport";

export const metadata: Metadata = {
  title: "Order product preview",
  description: "Review the products and totals in an order request.",
  referrer: "no-referrer",
  robots: { index: false, follow: false, nocache: true },
};

async function PreviewContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  let response: Response;
  try {
    // Resolved per request: the API binding only exists at runtime.
    response = await fetch(`${getServerApiUrl()}/orders/preview/${token}`, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  } catch {
    return <EmptyState icon={<FiLink />} title="We couldn’t load this preview" description="Please refresh in a moment. The order request is still saved." />;
  }
  if (response.status === 404) notFound();
  const { storeName, logo } = await getMetadataSettings();
  if (response.status === 410) return <div className="rounded-3xl border border-line bg-white p-6"><Logo storeName={storeName} logo={logo} /><EmptyState icon={<FiClock />} title="This order preview has expired" description="Ask the customer to share a fresh product preview link from My orders. Private order details remain protected." action={<ButtonLink href="/shop">Browse the shop</ButtonLink>} /></div>;
  const payload = await response.json().catch(() => null) as ApiResponse<OrderPreviewDTO> | null;
  if (!response.ok || !payload?.success) return <EmptyState icon={<FiLink />} title="This preview is temporarily unavailable" description="Please try again in a moment." />;
  return <OrderPreview order={payload.data} logo={logo} />;
}

export default function OrderPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
    <Suspense fallback={<div className="skeleton h-[640px] rounded-3xl" aria-label="Loading product preview" />}>
      <PreviewContent params={params} />
    </Suspense>
  </main>;
}
