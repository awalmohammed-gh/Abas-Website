"use client";

import { useState, type FormEvent } from "react";
import { FiSend } from "react-icons/fi";
import {
  CUSTOMER_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  flattenIssues,
  formatGHS,
  notificationInputSchema,
  type AdminNotificationDTO,
  type AdminProductDTO,
  type CustomerNotificationType,
  type NotificationSettings,
  type Paginated,
} from "@aba-mart/shared";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useDebounce } from "@/hooks/useDebounce";
import { ApiClientError, api } from "@/lib/api";
import { buildQuery } from "@/lib/utils";
import { storeDateTimeToIso } from "@/lib/time";

interface Draft {
  type: CustomerNotificationType;
  audience: "public" | "push_subscribers";
  title: string;
  message: string;
  targetUrl: string;
  expiresAt: string;
  sendPush: boolean;
}

const EMPTY: Draft = { type: "announcement", audience: "public", title: "", message: "", targetUrl: "", expiresAt: "", sendPush: true };

const TYPE_HINTS: Record<CustomerNotificationType, string> = {
  new_product: "Shown to customers who want new-product news.",
  promotion: "Only reaches customers who opted in to offers.",
  announcement: "Store news for every visitor.",
  important: "Service changes customers must know about, e.g. closures.",
  order_update: "Order updates are sent automatically to the order owner.",
};

function ProductPicker({ onPick }: { onPick: (product: AdminProductDTO) => void }) {
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 300);
  const results = useAdminResource<Paginated<AdminProductDTO>>(q.length >= 2 ? `/admin/products${buildQuery({ q, status: "active", limit: 5 })}` : null);
  return (
    <div className="space-y-2">
      <Input label="Link a product (optional)" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name" maxLength={100} />
      {q.length >= 2 && results.data && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {results.data.items.length === 0 && <li className="px-3 py-2 text-sm text-muted">No active products match.</li>}
          {results.data.items.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(product);
                  setSearch("");
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="min-w-0 truncate font-medium text-ink">{product.name}</span>
                <span className="shrink-0 text-xs text-muted">{formatGHS(product.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Compose a customer notification and save it as a draft or publish it.
 * Publishing stores it in MongoDB (customer feeds read it from there) and, if
 * chosen, queues Web Push to opted-in subscribers in the background.
 */
export function NotificationComposer({
  settings,
  pushConfigured,
  onSaved,
}: {
  settings: NotificationSettings;
  pushConfigured: boolean;
  onSaved?: (notification: AdminNotificationDTO) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  const typeEnabled = (type: CustomerNotificationType) =>
    type === "new_product" ? settings.newProducts : type === "promotion" ? settings.promotions : true;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  async function save(publish: boolean) {
    const expiresAt = form.expiresAt ? storeDateTimeToIso(form.expiresAt) : null;
    if (form.expiresAt && !expiresAt) {
      setErrors({ expiresAt: "Enter a valid date and time in Ghana time (GMT)." });
      return;
    }
    const payload = {
      ...form,
      sendPush: pushConfigured && (form.audience === "push_subscribers" || form.sendPush),
      expiresAt,
      publish,
    };
    const parsed = notificationInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error.issues));
      return;
    }
    if (publish && !typeEnabled(form.type)) {
      setErrors({ type: "This type is switched off in Settings → Notifications." });
      return;
    }
    setSaving(publish ? "publish" : "draft");
    try {
      const saved = await api.post<AdminNotificationDTO>("/admin/notifications", payload);
      toast.success(
        publish
          ? saved.push.status === "queued"
            ? "Published. Push alerts are being sent in the background."
            : "Published to the customer notification feed."
          : "Draft saved.",
      );
      setForm(EMPTY);
      setErrors({});
      onSaved?.(saved);
    } catch (error) {
      if (error instanceof ApiClientError) setErrors(error.fieldErrors);
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the notification.");
    } finally {
      setSaving(null);
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(true);
  };

  if (!settings.enabled) {
    return (
      <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
        Customer notifications are switched off. Turn them on above to publish announcements.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          required
          value={form.type}
          onChange={(e) => set("type", e.target.value as CustomerNotificationType)}
          error={errors.type}
          hint={TYPE_HINTS[form.type]}
          options={CUSTOMER_NOTIFICATION_TYPES.map((type) => ({
            value: type,
            label: typeEnabled(type) ? NOTIFICATION_TYPE_LABELS[type] : `${NOTIFICATION_TYPE_LABELS[type]} (switched off)`,
            disabled: !typeEnabled(type),
          }))}
        />
        <Select
          label="Who receives it"
          value={form.audience}
          onChange={(e) => set("audience", e.target.value as Draft["audience"])}
          error={errors.audience}
          hint={form.audience === "public" ? "Notification bell for every visitor, plus push to subscribers." : "Only browsers that turned on push alerts."}
          options={[
            { value: "public", label: "Everyone (bell + push)" },
            { value: "push_subscribers", label: "Push subscribers only", disabled: !pushConfigured },
          ]}
        />
      </div>

      {form.type === "new_product" && (
        <ProductPicker
          onPick={(product) => {
            setForm((f) => ({
              ...f,
              title: f.title || `Just in: ${product.name}`.slice(0, 80),
              message: f.message || `Now available for ${formatGHS(product.price)}. Order in minutes on WhatsApp.`,
              targetUrl: `/products/${product.slug}`,
            }));
          }}
        />
      )}

      <Input label="Title" required value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={80} placeholder="e.g. Fresh stock of shea butter soap" />
      <Textarea
        label="Message"
        rows={3}
        value={form.message}
        onChange={(e) => set("message", e.target.value)}
        error={errors.message}
        maxLength={300}
        hint="Public text only. Never include customer names, phone numbers or order details."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Link"
          value={form.targetUrl}
          onChange={(e) => set("targetUrl", e.target.value)}
          error={errors.targetUrl}
          maxLength={300}
          placeholder="/shop or /products/…"
          hint="A page on this store. Opens when the notification is tapped."
        />
        <Input
          label="Stop showing after (optional)"
          hint="Ghana time (GMT / Africa/Accra)."
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => set("expiresAt", e.target.value)}
          error={errors.expiresAt}
        />
      </div>
      {form.audience === "public" && (
        <Toggle
          label="Also send as a push alert"
          description={pushConfigured ? "Sent in the background to subscribers who allow this type." : "Push is not configured on the server (VAPID keys missing)."}
          checked={pushConfigured && form.sendPush}
          disabled={!pushConfigured}
          onChange={(checked) => set("sendPush", checked)}
        />
      )}
      {errors.sendPush && <p className="text-sm text-danger">{errors.sendPush}</p>}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" loading={saving === "draft"} disabled={saving !== null} onClick={() => void save(false)}>
          Save draft
        </Button>
        <Button type="submit" loading={saving === "publish"} disabled={saving !== null} leftIcon={<FiSend className="size-4" aria-hidden="true" />}>
          Publish now
        </Button>
      </div>
    </form>
  );
}
