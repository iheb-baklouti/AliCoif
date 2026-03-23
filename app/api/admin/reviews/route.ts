import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const postSchema = z.object({
  authorName: z.string().min(1),
  text: z.string().min(3),
  rating: z.number().int().min(1).max(5),
  published: z.boolean().optional(),
});

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const review = await prisma.review.create({
    data: { ...parsed.data, published: parsed.data.published ?? true },
  });
  return NextResponse.json({ review });
}
