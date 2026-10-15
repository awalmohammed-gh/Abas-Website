import { FaWhatsapp } from "react-icons/fa";
import { FiLayers, FiMapPin, FiUserCheck } from "react-icons/fi";

const BENEFITS = [
  {
    icon: FaWhatsapp,
    title: "Order on WhatsApp",
    text: "Your cart becomes a ready-to-send message. No forms to fill in twice, no app to install.",
  },
  {
    icon: FiUserCheck,
    title: "No account needed",
    text: "Shop as a guest. We only ask for your name, number and where you'd like your order.",
  },
  {
    icon: FiMapPin,
    title: "Delivery or pickup",
    text: "Choose what suits you. We confirm the details and timing with you directly.",
  },
  {
    icon: FiLayers,
    title: "Many categories, one store",
    text: "Personal care, clothing, household items and more — all in one order.",
  },
];

export function Benefits() {
  return (
    <section className="bg-white py-14 sm:py-16" aria-labelledby="benefits-heading">
      <div className="container-page">
        <div className="mb-8 max-w-2xl">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Why ABA Mart</p>
          <h2 id="benefits-heading" className="text-2xl font-bold text-ink sm:text-3xl">
            Shopping that fits the way you already talk to us
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-line bg-cream p-5">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand text-cream">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
