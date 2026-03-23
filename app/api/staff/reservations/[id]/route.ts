import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { emitSalonUpdate } from "@/lib/realtime";
import { SEAT_COUNT } from "@/lib/salon";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if ("error" in s) return s.error;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  const staff = await prisma.user.findUnique({ where: { id: s.session.sub } });
  if (!staff?.seatNumber || staff.seatNumber < 1 || staff.seatNumber > SEAT_COUNT) {
    return NextResponse.json({ error: "Siège non configuré pour ce compte" }, { status: 400 });
  }
  const mySeat = staff.seatNumber;

  const r = await prisma.reservation.findUnique({
    where: { id },
    include: { user: true, service: true },
  });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (body.action === "start") {
    if (r.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Seul un RDV confirmé peut démarrer" }, { status: 400 });
    }
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        seatNumber: mySeat,
        startedAt: new Date(),
        staffUserId: staff.id,
      },
      include: { user: true, service: true },
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  if (body.action === "complete") {
    if (r.status !== "IN_PROGRESS" || r.seatNumber !== mySeat) {
      return NextResponse.json({ error: "Ce RDV n’est pas en cours sur votre siège" }, { status: 400 });
    }
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        seatNumber: null,
        startedAt: null,
        staffUserId: null,
        completedById: staff.id,
      },
      include: { user: true, service: true },
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  return NextResponse.json({ error: "Action invalide (start | complete)" }, { status: 400 });
}
