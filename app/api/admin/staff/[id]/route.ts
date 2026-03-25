import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional().or(z.literal("")),
  seatNumber: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const current = await prisma.user.findFirst({ where: { id, role: "STAFF" } });
  if (!current) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const payload = parsed.data;
  const data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    phone?: string | null;
    seatNumber?: number;
  } = {};

  if (payload.name) data.name = payload.name.trim();
  if (payload.phone !== undefined) data.phone = payload.phone.trim() || null;

  if (payload.email) {
    const email = payload.email.trim().toLowerCase();
    const emailUsed = await prisma.user.findFirst({
      where: { email, id: { not: id } },
      select: { id: true },
    });
    if (emailUsed) {
      return NextResponse.json({ error: "Cet e-mail est déjà utilisé." }, { status: 409 });
    }
    data.email = email;
  }

  if (payload.seatNumber !== undefined) {
    const seatUsed = await prisma.user.findFirst({
      where: { role: "STAFF", seatNumber: payload.seatNumber, id: { not: id } },
      select: { id: true },
    });
    if (seatUsed) {
      return NextResponse.json({ error: "Ce siège est déjà attribué." }, { status: 409 });
    }
    data.seatNumber = payload.seatNumber;
  }

  if (payload.password) {
    data.passwordHash = await bcrypt.hash(payload.password, 10);
  }

  const staff = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, phone: true, seatNumber: true, createdAt: true },
  });

  return NextResponse.json({ staff });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const { id } = await params;
  if (a.session.sub === id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte admin." }, { status: 400 });
  }

  const current = await prisma.user.findFirst({ where: { id, role: "STAFF" } });
  if (!current) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
