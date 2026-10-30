"use client";

import { useEffect, useRef, useState } from "react";
import type { GuestSessionDTO } from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cartStore } from "@/contexts/cartStore";
import { errorMessage } from "@/lib/api";
import { acceptGuestSession, GUEST_CHANGED_EVENT, guestApi } from "@/lib/guest-api";
import { confirm } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/time";

export function GuestPrivacy({ onChanged }: { onChanged: () => void }) {
  const [token, setToken] = useState("");
  const [recovery, setRecovery] = useState<{ token: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visit = useRef(0);

  useEffect(() => {
    const clear = () => {
      visit.current += 1;
      setRecovery(null);
      setToken("");
      setMessage(null);
      setError(null);
    };
    window.addEventListener(GUEST_CHANGED_EVENT, clear);
    return () => window.removeEventListener(GUEST_CHANGED_EVENT, clear);
  }, []);

  async function action(kind: "save" | "recover" | "reset") {
    if (kind === "reset" && !(await confirm({ title: "Start a fresh guest visit?", description: "Your cart and previous orders will be hidden on this browser. Save a recovery code first if you want to return to them.", confirmLabel: "Start fresh", tone: "danger" }))) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const currentVisit = visit.current;
    try {
      if (kind === "save") {
        const code = await guestApi.post<{ token: string; expiresAt: string }>("/customer/recovery-token");
        if (visit.current === currentVisit) {
          setRecovery(code);
          setMessage("Keep this code somewhere private. It replaces any previous code for this visit.");
        }
      } else {
        const next = await guestApi.post<GuestSessionDTO>(kind === "reset" ? "/customer/session/reset" : "/customer/recover", kind === "recover" ? { token: token.trim() } : undefined);
        acceptGuestSession(next);
        cartStore.notifySessionChanged();
        await cartStore.refresh();
        setToken("");
        setRecovery(null);
        setMessage(kind === "reset" ? "A fresh guest visit is ready." : "Your private visit has been restored. This code has now been used; save a new one if needed.");
        onChanged();
      }
    } catch (cause) {
      if (visit.current === currentVisit) setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold text-brand">Guest privacy &amp; recovery</summary>
      <div className="mt-5 space-y-5 text-sm">
        <p className="max-w-2xl leading-relaxed text-muted">Your orders belong to this browser’s private visit. Clearing cookies or switching browsers starts a new visit. People using the same browser profile can share this visit.</p>
        <div>
          <Button variant="secondary" disabled={busy} onClick={() => void action("save")}>Create a private recovery code</Button>
          {recovery && <div className="mt-3 rounded-xl bg-brand-50 p-4">
            <p className="mb-2 font-medium">Save this code privately. Anyone with it can access this visit’s cart and orders.</p>
            <code className="block select-all break-all rounded-lg bg-white p-3 font-mono">{recovery.token}</code>
            <p className="mt-2 text-xs text-muted">One use · Expires {formatDateTime(recovery.expiresAt)}. It is shown only on this page.</p>
          </div>}
        </div>
        <form className="max-w-xl space-y-3" onSubmit={(event) => { event.preventDefault(); void action("recover"); }}>
          <Input label="Restore a previous visit" hint="Enter your private recovery code. Order references and phone numbers cannot restore access." value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" spellCheck={false} maxLength={43} />
          <Button type="submit" variant="secondary" disabled={busy || token.trim().length !== 43}>Restore my visit</Button>
        </form>
        <div className="border-t border-line pt-4">
          <p className="mb-3 text-muted">Using a shared device? Start a fresh visit to hide the previous cart and order history on this browser.</p>
          <Button variant="secondary" disabled={busy} onClick={() => void action("reset")}>Start a fresh guest visit</Button>
        </div>
        {message && <p role="status" className="text-brand">{message}</p>}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </div>
    </details>
  );
}
