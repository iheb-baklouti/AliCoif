import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPriceTND } from "@/lib/format";
import { SalonSeats } from "@/components/SalonSeats";

export const dynamic = "force-dynamic";

const FALLBACK_HERO = [
  { url: "/salon-facade.png", alt: "Façade du salon L'Artiste" },
  { url: "/salon-lifestyle.png", alt: "Ali Chakroun — L'Artiste" },
];

async function getHomeData() {
  try {
    const [services, reviews, heroMedia] = await Promise.all([
      prisma.service.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
      }),
      prisma.review.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.mediaAsset.findMany({
        where: { kind: "HERO" },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    const hero =
      heroMedia.length > 0
        ? heroMedia.map((m) => ({ url: m.url, alt: m.alt ?? "L'Artiste" }))
        : FALLBACK_HERO;
    return { services, reviews, hero };
  } catch (e) {
    console.error("[home] Prisma indisponible — affichage dégradé.", e);
    return { services: [], reviews: [], hero: FALLBACK_HERO };
  }
}

export default async function Home() {
  const { services, reviews, hero } = await getHomeData();
  const main = hero[0];
  const side = hero[1];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#c9a227]">
              Barbier &amp; coiffure hommes
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-tight text-white md:text-6xl">
              L&apos;Artiste
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/70">
              Salon réservé aux hommes — noir &amp; or, coupes nettes, barbe et forfaits premium à Kairouan. Demande de
              réservation en ligne, validation par le salon.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/reservation"
                className="rounded-full bg-[#c9a227] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#e4c04a]"
              >
                Demander un rendez-vous
              </Link>
              <Link
                href="/services"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-[#c9a227]/60 hover:text-[#c9a227]"
              >
                Voir les services
              </Link>
            </div>
          </div>
          <div className="animate-fade-up grid gap-4 [animation-delay:120ms] sm:grid-cols-2">
            {main && (
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50 sm:col-span-2 sm:aspect-[16/10]">
                <Image
                  src={main.url}
                  alt={main.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            )}
            {side && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 sm:col-span-2 sm:max-h-[320px]">
                <Image
                  src={side.url}
                  alt={side.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl text-white">Services phares</h2>
            <p className="mt-2 text-white/60">Tarifs indicatifs — salon hommes.</p>
          </div>
          <Link href="/services" className="text-sm font-semibold text-[#c9a227] hover:underline">
            Tous les services →
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <div
              key={s.id}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#c9a227]/35"
            >
              <p className="text-xs uppercase tracking-wider text-white/45">{s.category}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{s.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-white/55">{s.description}</p>
              <p className="mt-4 text-xl font-semibold text-[#c9a227]">{formatPriceTND(s.priceCents)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-[family-name:var(--font-display)] text-4xl text-white">Salon en direct</h2>
          <p className="mt-2 max-w-2xl text-white/60">
            Les 5 postes : disponibilité, client en cours et temps restant estimé (mise à jour instantanée).
          </p>
          <div className="mt-8">
            <SalonSeats />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-4xl text-white">Témoignages</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <blockquote
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/80"
            >
              <p className="text-sm leading-relaxed">&ldquo;{r.text}&rdquo;</p>
              <footer className="mt-4 text-xs font-semibold text-[#c9a227]">
                {r.authorName} — {r.rating}/5
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
