import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const patchSchema = z.object({
  kind: z.enum(["HERO", "EQUIPE", "GALLERY"]).optional(),
  sortOrder: z.number().int().optional(),
  alt: z.string().nullable().optional(),
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
  const media = await prisma.mediaAsset.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ media });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const { id } = await ctx.params;
  const row = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (row.url.startsWith("/uploads/")) {
    const fsPath = path.join(process.cwd(), "public", row.url.replace(/^\//, ""));
    try {
      await unlink(fsPath);
    } catch {
      /* fichier déjà absent */
    }
  }

  await prisma.mediaAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
