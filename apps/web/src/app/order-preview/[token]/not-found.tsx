import { FiLink } from "react-icons/fi";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PreviewNotFound() {
  return <main className="mx-auto w-full max-w-3xl px-4 py-12"><div className="rounded-3xl border border-line bg-white p-6"><Logo /><EmptyState icon={<FiLink />} title="This order preview isn’t available" description="The link may be invalid or may have been replaced. Ask the customer for a fresh product preview link." action={<ButtonLink href="/shop">Browse the shop</ButtonLink>} /></div></main>;
}
