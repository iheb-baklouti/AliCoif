import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const defaultHours = { open: "09:00", close: "19:00", slotMinutes: 30 };

const patchSchema = z.object({
  heroVideoUrl: z.string().optional(),
  businessHours: z
    .object({
      open: z.string(),
      close: z.string(),
      slotMinutes: z.number().int().min(10).max(120),
    })
    .optional(),
});

export async function GET() {
  const hero = await prisma.setting.findUnique({ where: { key: "hero_video" } });
  const bh = await prisma.setting.findUnique({ where: { key: "business_hours" } });
  let businessHours = defaultHours;
  if (bh?.value) {
    try {
      businessHours = { ...defaultHours, ...JSON.parse(bh.value) };
    } catch {
      /* ignore */
    }
  }
  return NextResponse.json({
    heroVideoUrl: hero?.value ?? "",
    businessHours,
  });
}

export async function PATCH(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  if (parsed.data.heroVideoUrl !== undefined) {
    await prisma.setting.upsert({
      where: { key: "hero_video" },
      create: { key: "hero_video", value: parsed.data.heroVideoUrl },
      update: { value: parsed.data.heroVideoUrl },
    });
  }
  if (parsed.data.businessHours) {
    await prisma.setting.upsert({
      where: { key: "business_hours" },
      create: { key: "business_hours", value: JSON.stringify(parsed.data.businessHours) },
      update: { value: JSON.stringify(parsed.data.businessHours) },
    });
  }

  return NextResponse.json({ ok: true });
}
