import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatPriceTND } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-5xl text-white">Services &amp; tarifs</h1>
        <p className="mt-4 text-lg text-white/65">
          Une carte pensée pour hommes et femmes : coupes, couleur, soins et finitions premium.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {services.map((s) => (
          <article
            key={s.id}
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#c9a227]/35"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">{s.category}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{s.name}</h2>
              </div>
              <p className="text-xl font-semibold text-[#c9a227]">{formatPriceTND(s.priceCents)}</p>
            </div>
            {s.description && <p className="mt-4 text-sm leading-relaxed text-white/60">{s.description}</p>}
            <p className="mt-4 text-xs text-white/40">Durée indicative : {s.durationMinutes} min</p>
          </article>
        ))}
      </div>
      <div className="mt-12">
        <Link
          href="/reservation"
          className="inline-flex rounded-full bg-[#c9a227] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#e4c04a]"
        >
          Prendre rendez-vous
        </Link>
      </div>
    </div>
  );
}
