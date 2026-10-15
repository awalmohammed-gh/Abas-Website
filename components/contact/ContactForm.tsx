"use client";

import { useState, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Composes an enquiry and hands it to WhatsApp click-to-chat. Nothing is stored on our servers. */
export function ContactForm({ whatsappNumber, storeName }: { whatsappNumber: string; storeName: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = {
      name: name.trim().length < 2 ? "Please enter your name" : undefined,
      message: message.trim().length < 5 ? "Please write a short message" : undefined,
    };
    setErrors(next);
    if (next.name || next.message) return;
    const text = `Hello ${storeName},\n\n${message.trim()}\n\n— ${name.trim()}`;
    window.open(buildWhatsAppUrl(whatsappNumber, text), "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Send us a message</h2>
      <Input label="Your name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} autoComplete="name" />
      <Textarea
        label="Message"
        required
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={errors.message}
        maxLength={1000}
        placeholder="Ask about a product, delivery to your area, or an existing order…"
      />
      <Button type="submit" variant="whatsapp" size="lg" className="w-full sm:w-auto" leftIcon={<FaWhatsapp className="size-5" aria-hidden="true" />}>
        Send on WhatsApp
      </Button>
      <p className="text-xs text-muted">WhatsApp opens with your message ready. It&apos;s only sent when you tap send.</p>
    </form>
  );
}
