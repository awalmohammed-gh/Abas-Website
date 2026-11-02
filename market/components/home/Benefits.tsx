import { FaWhatsapp } from "react-icons/fa";
import { FiLayers, FiMapPin, FiUserCheck } from "react-icons/fi";

const BENEFITS = [
  { icon: FaWhatsapp, title: "Friendly Support", text: "Confirm your order directly on WhatsApp." },
  { icon: FiUserCheck, title: "Easy Shopping", text: "Find your favourites and shop as a guest." },
  { icon: FiMapPin, title: "Delivery & Pickup", text: "Arrange the details with our team." },
  { icon: FiLayers, title: "Something for Everyone", text: "Explore something from every shelf." },
];

export function Benefits() {
  return (
    <section className="container-page pt-3 pb-8" aria-labelledby="benefits-heading">
      <h2 id="benefits-heading" className="mb-3 text-xl font-extrabold">Why Shop With Us?</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, text }) => <li key={title} className="flex items-start gap-3 rounded-xl border border-line bg-[#f8faff] px-4 py-4"><span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand"><Icon className="size-[18px]" aria-hidden="true" /></span><div><h3 className="text-sm font-bold leading-relaxed text-ink">{title}</h3><p className="mt-1 text-[11px] leading-relaxed text-muted">{text}</p></div></li>)}
      </ul>
    </section>
  );
}