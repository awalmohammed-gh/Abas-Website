import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-brand">
      <Spinner label="Loading page" />
    </div>
  );
}
