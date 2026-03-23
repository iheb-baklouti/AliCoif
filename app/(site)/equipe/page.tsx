import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COPY = [
  {
    name: "Ali Chakroun",
    role: "Fondateur & styliste",
    bio: "Signature L’Artiste : lignes nettes, textures travaillées, finitions irréprochables.",
  },
  {
    name: "L’équipe créative",
    role: "Coloristes & barbiers",
    bio: "Une équipe formée aux tendances urbaines et aux techniques de coupe contemporaines.",
  },
];

export default async function EquipePage() {
  const media = await prisma.mediaAsset.findMany({
    where: { kind: "EQUIPE" },
    orderBy: { sortOrder: "asc" },
  });
  const img0 = media[0]?.url ?? "/salon-lifestyle.png";
  const img1 = media[1]?.url ?? "/salon-facade.png";
  const alt0 = media[0]?.alt ?? "Ali Chakroun";
  const alt1 = media[1]?.alt ?? "Salon L'Artiste";
  const urls = [img0, img1];
  const alts = [alt0, alt1];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-white">L&apos;équipe</h1>
      <p className="mt-4 max-w-2xl text-lg text-white/65">
        Des profils complémentaires pour un service sur-mesure — du simple refresh à la transformation complète.
      </p>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {COPY.map((m, i) => (
          <div
            key={m.name}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[#c9a227]/35"
          >
            <div className="relative aspect-[4/3] bg-black/40">
              <Image
                src={urls[i] ?? urls[0]}
                alt={alts[i] ?? m.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="p-6">
              <p className="text-xs uppercase tracking-wider text-[#c9a227]">{m.role}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{m.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{m.bio}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-white/45">
        Photos gérées depuis Admin → Médias (type « Équipe », ordre 0 puis 1).
      </p>
    </div>
  );
}
