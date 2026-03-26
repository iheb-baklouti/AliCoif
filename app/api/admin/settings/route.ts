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
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  salonAddress: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z
    .object({ current: z.string(), next: z.string().min(6) })
    .optional(),
});

async function getSetting(key: string, fallback = "") {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function GET() {
  const [hero, bh, phone, whatsapp, salonAddress, adminEmail] = await Promise.all([
    getSetting("hero_video"),
    getSetting("business_hours"),
    getSetting("phone"),
    getSetting("whatsapp"),
    getSetting("salon_address"),
    getSetting("admin_email"),
  ]);

  let businessHours = defaultHours;
  if (bh) {
    try {
      businessHours = { ...defaultHours, ...JSON.parse(bh) };
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    heroVideoUrl: hero,
    businessHours,
    phone,
    whatsapp,
    salonAddress,
    adminEmail,
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

  const { data } = parsed;

  if (data.heroVideoUrl !== undefined) await setSetting("hero_video", data.heroVideoUrl);
  if (data.businessHours) await setSetting("business_hours", JSON.stringify(data.businessHours));
  if (data.phone !== undefined) await setSetting("phone", data.phone);
  if (data.whatsapp !== undefined) await setSetting("whatsapp", data.whatsapp);
  if (data.salonAddress !== undefined) await setSetting("salon_address", data.salonAddress);
  if (data.adminEmail !== undefined) await setSetting("admin_email", data.adminEmail);

  if (data.adminPassword) {
    const bcrypt = await import("bcryptjs");
    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!user) return NextResponse.json({ error: "Admin introuvable" }, { status: 404 });
    const ok = await bcrypt.compare(data.adminPassword.current, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
    const hash = await bcrypt.hash(data.adminPassword.next, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  }

  return NextResponse.json({ ok: true });
}
