import { FaWhatsapp } from "react-icons/fa";
import { FiLayers, FiMapPin, FiUserCheck } from "react-icons/fi";

const BENEFITS = [
  { icon: FaWhatsapp, title: "A real person, a real conversation", text: "Confirm your order directly on WhatsApp." },
  { icon: FiUserCheck, title: "No account needed", text: "Find your favourites and shop as a guest." },
  { icon: FiMapPin, title: "Delivery or pickup", text: "Arrange the details with our team." },
  { icon: FiLayers, title: "Your everyday, in one place", text: "Explore something from every shelf." },
];

export function Benefits() {
  return (
    <section className="container-page py-6 sm:py-8" aria-labelledby="benefits-heading">
      <h2 id="benefits-heading" className="sr-only">Shopping with us</h2>
      <ul className="grid gap-5 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:p-6">
        {BENEFITS.map(({ icon: Icon, title, text }) => <li key={title} className="flex items-start gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand"><Icon className="size-[18px]" aria-hidden="true" /></span><div><h3 className="text-xs font-semibold leading-relaxed text-ink">{title}</h3><p className="mt-1 text-[11px] leading-relaxed text-muted">{text}</p></div></li>)}
      </ul>
    </section>
  );
}