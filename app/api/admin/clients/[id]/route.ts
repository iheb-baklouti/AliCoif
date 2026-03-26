import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, preferences: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const where: Record<string, unknown> = { userId: id };
  if (status) where.status = status;
  if (from || to) {
    where.scheduledAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      service: { select: { name: true, priceCents: true, durationMinutes: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 200,
  });

  const totalSpentCents = reservations
    .filter((r) => r.status === "COMPLETED")
    .reduce((acc, r) => acc + r.service.priceCents, 0);

  return NextResponse.json({ user, reservations, totalSpentCents });
}
