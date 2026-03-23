import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { key: "business_hours" },
    create: {
      key: "business_hours",
      value: JSON.stringify({ open: "09:00", close: "19:00", slotMinutes: 30 }),
    },
    update: {},
  });

  const hash = await bcrypt.hash("Admin123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@lartiste.tn" },
    create: {
      email: "admin@lartiste.tn",
      passwordHash: hash,
      name: "Ali Chakroun",
      phone: "+21620392769",
      role: "ADMIN",
    },
    update: { passwordHash: hash },
  });

  const staffHash = await bcrypt.hash("Staff123!", 10);
  const staffSeeds = [
    { email: "staff1@lartiste.tn", name: "Coiffeur Siège 1", seatNumber: 1 },
    { email: "staff2@lartiste.tn", name: "Coiffeur Siège 2", seatNumber: 2 },
  ];
  for (const s of staffSeeds) {
    await prisma.user.upsert({
      where: { email: s.email },
      create: {
        email: s.email,
        passwordHash: staffHash,
        name: s.name,
        phone: "+21620392769",
        role: "STAFF",
        seatNumber: s.seatNumber,
      },
      update: { passwordHash: staffHash, seatNumber: s.seatNumber, role: "STAFF" },
    });
  }

  await prisma.service.deleteMany({ where: { slug: "coupe-femme" } });

  const services = [
    {
      name: "Coupe homme",
      slug: "coupe-homme",
      description: "Coupe tendance, finitions au rasoir.",
      priceCents: 2500,
      durationMinutes: 30,
      category: "Homme",
      sortOrder: 1,
    },
    {
      name: "Forfait mariage",
      slug: "forfait-mariage",
      description:
        "Pack premium grand jour : coupe, barbe, soin, mise en forme — le forfait le plus complet du salon.",
      priceCents: 25000,
      durationMinutes: 120,
      category: "Homme",
      sortOrder: 2,
    },
    {
      name: "Brushing",
      slug: "brushing",
      description: "Mise en forme et brillance.",
      priceCents: 2000,
      durationMinutes: 30,
      category: "Homme",
      sortOrder: 3,
    },
    {
      name: "Coloration",
      slug: "coloration",
      description: "Coloration complète ou mèches.",
      priceCents: 12000,
      durationMinutes: 90,
      category: "Homme",
      sortOrder: 4,
    },
    {
      name: "Barbe & contours",
      slug: "barbe",
      description: "Taille de barbe et contours nets.",
      priceCents: 1500,
      durationMinutes: 20,
      category: "Homme",
      sortOrder: 5,
    },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      create: s,
      update: {
        name: s.name,
        description: s.description,
        priceCents: s.priceCents,
        durationMinutes: s.durationMinutes,
        category: s.category,
        sortOrder: s.sortOrder,
      },
    });
  }

  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    const reviews = [
      { authorName: "Karim M.", text: "Service impeccable, ambiance au top.", rating: 5, published: true },
      { authorName: "Sonia B.", text: "Équipe pro et à l’écoute.", rating: 5, published: true },
      { authorName: "Mehdi A.", text: "La meilleure coupe depuis des années.", rating: 5, published: true },
    ];
    await prisma.review.createMany({ data: reviews });
  }

  const mediaSeeds = [
    { url: "/salon-facade.png", alt: "Façade du salon L'Artiste", kind: "HERO", sortOrder: 0 },
    { url: "/salon-lifestyle.png", alt: "Ali Chakroun — L'Artiste", kind: "HERO", sortOrder: 1 },
    { url: "/salon-lifestyle.png", alt: "Ali Chakroun", kind: "EQUIPE", sortOrder: 0 },
    { url: "/salon-facade.png", alt: "Salon L'Artiste", kind: "EQUIPE", sortOrder: 1 },
  ];
  for (const m of mediaSeeds) {
    const exists = await prisma.mediaAsset.findFirst({
      where: { url: m.url, kind: m.kind, sortOrder: m.sortOrder },
    });
    if (!exists) await prisma.mediaAsset.create({ data: m });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
