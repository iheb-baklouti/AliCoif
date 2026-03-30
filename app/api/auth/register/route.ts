import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signToken } from "@/lib/auth";

const rateLimit = new Map<string, { count: number; lastReset: number }>();
function checkRateLimit(ip: string) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 heure pour création de compte
  const limit = 3;
  const user = rateLimit.get(ip);
  if (!user || now - user.lastReset > windowMs) {
    rateLimit.set(ip, { count: 1, lastReset: now });
    return true;
  }
  if (user.count >= limit) return false;
  user.count += 1;
  return true;
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Trop de tentatives de création. Réessayez plus tard." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { email, password, name, phone } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) {
    return NextResponse.json({ error: "Cet e-mail est déjà utilisé" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      phone: phone || null,
      role: "CLIENT",
    },
  });

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    seatNumber: null,
  });
  await setAuthCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
