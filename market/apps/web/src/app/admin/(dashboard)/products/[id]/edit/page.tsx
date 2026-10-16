import { Suspense } from "react";
import { LoadingBlock } from "@/components/admin/AdminUI";
import { ProductEditor } from "./ProductEditor";

async function EditorLoader({ params }: { params: PageProps<"/admin/products/[id]/edit">["params"] }) {
  const { id } = await params;
  return <ProductEditor id={id} />;
}

export const instant = false;

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading product" />}>
      <EditorLoader params={params} />
    </Suspense>
  );
}
