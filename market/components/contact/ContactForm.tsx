"use client";

import { useState, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const TOPICS = ["Product question", "Delivery", "My order", "Something else"] as const;

/** Composes an enquiry and hands it to WhatsApp click-to-chat. Nothing is stored on our servers. */
export function ContactForm({ whatsappNumber, storeName }: { whatsappNumber: string; storeName: string }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(TOPICS[0]);
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
    const text = `Hello ${storeName},\n\nTopic: ${topic}\n\n${message.trim()}\n\n— ${name.trim()}`;
    window.open(buildWhatsAppUrl(whatsappNumber, text), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="checkout-panel" aria-labelledby="contact-form-heading">
      <header className="checkout-panel-header">
        <FaWhatsapp className="checkout-whatsapp-icon" aria-hidden="true" />
        <div>
          <h2 id="contact-form-heading">Send Us a Message</h2>
          <p>Write your question here and send it to us on WhatsApp.</p>
        </div>
      </header>
      <form onSubmit={submit} noValidate className="checkout-form-body space-y-5">
        <Input label="Your name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} autoComplete="name" placeholder="Enter your full name" />
        <fieldset>
          <legend className="mb-2 text-[15px] font-medium text-ink">What is it about?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TOPICS.map((value) => (
              <label key={value} className="contact-topic">
                <input type="radio" name="topic" value={value} checked={topic === value} onChange={() => setTopic(value)} className="sr-only" />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
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
        <div>
          <Button type="submit" variant="whatsapp" className="checkout-send-button" leftIcon={<FaWhatsapp aria-hidden="true" />} rightIcon={<FiArrowRight aria-hidden="true" />}>
            Send on WhatsApp
          </Button>
          <p className="mt-3 text-center text-xs text-muted">WhatsApp opens with your message ready. It&apos;s only sent when you tap send.</p>
        </div>
      </form>
    </section>
  );
}
