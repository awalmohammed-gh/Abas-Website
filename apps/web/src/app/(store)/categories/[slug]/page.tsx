import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { ProductGridSkeleton } from "@/components/products/ProductGrid";
import { ProductListing } from "@/components/products/ProductListing";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategory, getMetadataSettings } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [category, { storeName }] = await Promise.all([getCategory(slug), getMetadataSettings()]);
  if (!category || category === "error") return { title: "Category" };
  return {
    title: category.name,
    description: category.description || `Shop ${category.name} at ${storeName} and order on WhatsApp.`,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: category.image ? { images: [{ url: category.image.url, alt: category.name }] } : undefined,
  };
}

async function CategoryContent({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (category === null) notFound();
  if (category === "error") {
    return (
      <EmptyState icon={<FiAlertCircle />} title="We couldn't load this category" description="Please refresh the page in a moment." />
    );
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/shop" className="hover:text-brand">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-ink">
            {category.name}
          </li>
        </ol>
      </nav>
      <header className="mb-8 flex flex-col gap-5 overflow-hidden rounded-3xl border border-line bg-white sm:flex-row sm:items-center">
        {category.image && (
          <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-square sm:w-48">
            <Image src={category.image.url} alt="" fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover" priority />
          </div>
        )}
        <div className="p-5 sm:p-6">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{category.name}</h1>
          {category.description && <p className="mt-2 max-w-2xl text-muted">{category.description}</p>}
        </div>
      </header>
      <ProductListing searchParams={searchParams} category={category} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/categories/[slug]">) {
  return (
    <div className="container-page py-8 sm:py-12">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="skeleton h-32" />
            <ProductGridSkeleton />
          </div>
        }
      >
        <CategoryContent {...props} />
      </Suspense>
    </div>
  );
}
