import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight, FiCheck, FiGrid, FiShoppingBag } from "react-icons/fi";
import { formatGHS, priceRange } from "@aba-mart/shared";
import { ButtonLink } from "@/components/ui/Button";
import { ProductImage } from "@/components/products/ProductImage";
import { getBanners, getProducts, getSettings } from "@/lib/catalog";
import { supportChatUrl } from "@/lib/whatsapp";
import { HeroCarousel } from "./HeroCarousel";

export async function Hero() {
  const [banners, result, settings] = await Promise.all([getBanners(), getProducts({ sort: "newest", availability: "in-stock", limit: 4 }), getSettings()]);
  const products = result?.items.slice(0, 2) ?? [];
  const chatUrl = supportChatUrl(settings);
  return (
    <section className="container-page pt-5 sm:pt-7" aria-label="Welcome to the store">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_290px]">
        {banners.length ? <div className="min-w-0 overflow-hidden rounded-2xl"><HeroCarousel banners={banners} /></div> : (
          <div className="relative grid min-w-0 gap-5 overflow-hidden rounded-2xl border border-brand/5 bg-[#eaf0e9] p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] sm:items-center sm:p-8">
            <div className="relative z-10">
              <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-brand"><span className="size-1.5 rounded-full bg-brand" />A little of everything you love</p>
              <h1 className="max-w-sm font-display text-3xl font-bold leading-[1.08] tracking-tight text-brand-deep sm:text-[2.75rem]">Everyday finds.<br /><span className="text-brand/65">All in one place.</span></h1>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">Discover your next favourite. Browse, add to your cart, and order with us on WhatsApp.</p>
              <ButtonLink href="/shop" className="mt-4 sm:mt-6" rightIcon={<FiArrowRight className="size-4" aria-hidden="true" />}>Explore the store</ButtonLink>
              <p className="mt-4 hidden items-center gap-1.5 text-[11px] text-brand sm:flex"><FiCheck className="size-3.5" aria-hidden="true" />No account needed</p>
            </div>
            <div className="relative hidden grid-cols-2 gap-3 sm:-mr-2 sm:grid sm:gap-2" aria-label="A peek at our latest products">
              {products.length ? products.map((product, index) => (
                <Link key={product.id} href={`/products/${product.slug}`} className={`group min-w-0 rounded-xl border border-white/70 bg-white p-2 shadow-sm transition-transform motion-safe:hover:-translate-y-1 ${index === 1 ? "sm:mt-8" : "sm:mb-8"}`}>
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-cream"><ProductImage src={product.images[0]?.url} alt={product.images[0]?.alt || product.name} sizes="(min-width: 1024px) 160px, (min-width: 640px) 20vw, 40vw" priority fit="contain" /></div>
                  <p className="mt-2 line-clamp-1 text-[11px] font-medium text-ink">{product.name}</p>
                  <p className="mt-1 text-xs font-bold text-brand">{priceRange(product).min !== priceRange(product).max && "From "}{formatGHS(priceRange(product).min)}</p>
                </Link>
              )) : <div className="col-span-2 flex min-h-40 items-center justify-center gap-4 rounded-2xl border border-white/70 bg-white/35 p-6 text-brand/30"><FiShoppingBag className="size-20 -rotate-12" aria-hidden="true" /><FiGrid className="size-14 rotate-12" aria-hidden="true" /></div>}
            </div>
          </div>
        )}
        <aside className="hidden min-w-0 flex-col justify-between rounded-2xl border border-accent/15 bg-[#fff0d9] p-5 sm:p-6 lg:flex">
          <div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/80 text-brand"><FaWhatsapp className="size-5" aria-hidden="true" /></span>
            <h2 className="mt-4 max-w-xs text-xl font-bold leading-tight text-brand-deep">Your finds.<br className="hidden lg:block" /> A real conversation.</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink/65">Shopping made personal, from your first question to your final order.</p>
            <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/80 lg:flex-col lg:gap-2.5">
              {["Find something you love", "Add it to your cart", "Send your order on WhatsApp"].map((step, i) => <li key={step} className="flex items-center gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand">{i + 1}</span>{step}</li>)}
            </ol>
          </div>
          <ButtonLink href={chatUrl || "/contact"} external={!!chatUrl} variant="secondary" size="sm" className="mt-5 self-start border-brand/15 bg-transparent" rightIcon={<FiArrowRight className="size-3.5" aria-hidden="true" />}>{chatUrl ? "Chat with us" : "Get in touch"}{chatUrl && <span className="sr-only"> (opens in a new tab)</span>}</ButtonLink>
        </aside>
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return <div className="container-page pt-5 sm:pt-7" aria-hidden="true"><div className="skeleton h-80 rounded-2xl" /></div>;
}
