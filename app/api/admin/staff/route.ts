import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional().or(z.literal("")),
  seatNumber: z.number().int().min(1).max(5),
});

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: [{ seatNumber: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      seatNumber: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ staff });
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const payload = parsed.data;
  const email = payload.email.trim().toLowerCase();

  const [emailUsed, seatUsed] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findFirst({ where: { role: "STAFF", seatNumber: payload.seatNumber } }),
  ]);

  if (emailUsed) {
    return NextResponse.json({ error: "Cet e-mail est déjà utilisé." }, { status: 409 });
  }
  if (seatUsed) {
    return NextResponse.json({ error: "Ce siège est déjà attribué." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const staff = await prisma.user.create({
    data: {
      role: "STAFF",
      name: payload.name.trim(),
      email,
      passwordHash,
      phone: payload.phone?.trim() || null,
      seatNumber: payload.seatNumber,
    },
    select: { id: true, name: true, email: true, phone: true, seatNumber: true, createdAt: true },
  });

  return NextResponse.json({ staff }, { status: 201 });
}
