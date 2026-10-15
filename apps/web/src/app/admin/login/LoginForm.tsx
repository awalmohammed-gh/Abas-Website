"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminLoginSchema, flattenIssues, type AdminSession } from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiClientError, api, setCsrfToken } from "@/lib/api";

/** Only allow redirects back into the admin area. */
function safeNext(value: string | null): string {
  return value && /^\/admin(\/[\w\-/]*)?$/.test(value) && !value.startsWith("/admin/login") ? value : "/admin";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(
    params.get("reason") === "expired" ? "Your session has ended. Please sign in again." : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = adminLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error.issues));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const session = await api.post<AdminSession>("/admin/auth/login", parsed.data);
      setCsrfToken(session.csrfToken);
      router.replace(safeNext(params.get("next")));
    } catch (error) {
      setPassword("");
      setFormError(error instanceof ApiClientError ? error.message : "Could not sign in. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && (
        <p className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger" role="alert">
          {formError}
        </p>
      )}
      <Input
        label="Email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        maxLength={254}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        maxLength={200}
      />
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Sign in
      </Button>
    </form>
  );
}
