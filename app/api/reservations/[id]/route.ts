import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { dayBounds, queueInfoForReservation } from "@/lib/salon";
import { emitSalonUpdate } from "@/lib/realtime";

const patchSchema = z.object({
  action: z.enum(["cancel"]),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const { id } = await ctx.params;
  const r = await prisma.reservation.findFirst({
    where: { id, userId: u.session.sub },
    include: { service: true },
  });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const { start, end } = dayBounds(r.scheduledAt);
  const queue =
    r.status === "CONFIRMED" || r.status === "IN_PROGRESS"
      ? await queueInfoForReservation(r, start, end)
      : { positionAhead: 0, estimatedWaitMinutes: 0 };
  return NextResponse.json({ reservation: { ...r, queue } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const r = await prisma.reservation.findFirst({
    where: { id, userId: u.session.sub },
  });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (parsed.data.action === "cancel") {
    if (r.status !== "PENDING" && r.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Annulation impossible pour ce statut" }, { status: 400 });
    }
    await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await emitSalonUpdate();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Non supporté" }, { status: 400 });
}
