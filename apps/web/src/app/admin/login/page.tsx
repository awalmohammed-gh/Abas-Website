import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandMark } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-deep px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center text-cream">
          <BrandMark className="size-14" inverted />
          <h1 className="mt-5 text-2xl font-bold">ABA Mart Admin</h1>
          <p className="mt-1 text-sm text-cream/70">Sign in to manage products, orders and the store.</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-pop sm:p-7">
          <Suspense fallback={<div className="skeleton h-56" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-cream/60">Authorised staff only. Activity is recorded.</p>
      </div>
    </main>
  );
}
