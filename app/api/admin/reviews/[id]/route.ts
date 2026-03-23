import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const patchSchema = z.object({
  published: z.boolean().optional(),
  text: z.string().min(3).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const review = await prisma.review.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ review });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const { id } = await ctx.params;
  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
