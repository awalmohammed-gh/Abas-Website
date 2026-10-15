import { FiSearch } from "react-icons/fi";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function StoreNotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={<FiSearch />}
        title="We couldn't find that"
        description="The product or page may have been removed, or the link might be mistyped."
        action={
          <>
            <ButtonLink href="/shop">Browse products</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Go home
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}
