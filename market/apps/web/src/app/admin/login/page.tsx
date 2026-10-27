import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandMark, Logo } from "@/components/brand/Logo";
import { InstallPwaButton } from "@/components/ui/InstallPwaButton";
import { getMetadataSettings } from "@/lib/catalog";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  const { storeName, logo } = await getMetadataSettings();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-deep pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center text-cream">
          {logo ? <Logo storeName={storeName} logo={logo} tone="dark" admin /> : <BrandMark className="size-20" inverted admin />}
          <h1 className="mt-5 text-2xl font-bold">{storeName} Admin</h1>
          <p className="mt-1 text-sm text-cream/70">Sign in to manage products, orders and the store.</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-pop sm:p-7">
          <Suspense fallback={<div className="skeleton h-56" />}>
            <LoginForm />
          </Suspense>
          <InstallPwaButton variant="login-card" />
        </div>
        <p className="mt-6 text-center text-xs text-cream/60">Authorised staff only. Activity is recorded.</p>
      </div>
    </main>
  );
}
