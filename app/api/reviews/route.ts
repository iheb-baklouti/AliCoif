import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const reviews = await prisma.review.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return NextResponse.json({ reviews });
}

const postSchema = z.object({
  text: z.string().min(3, "L'avis doit contenir au moins 3 caractères."),
  rating: z.number().int().min(1).max(5),
});

export async function POST(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const user = await prisma.user.findUnique({ where: { id: u.session.sub } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      authorName: user.name,
      text: parsed.data.text,
      rating: parsed.data.rating,
      published: false, // Admin must approve before it's visible
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
