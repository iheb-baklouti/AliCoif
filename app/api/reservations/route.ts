import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { dayBounds, queueInfoForReservation, SEAT_COUNT } from "@/lib/salon";
import { emitSalonUpdate } from "@/lib/realtime";
import { getBusinessHours } from "@/lib/slots";
import {
  notifyAdminNewReservation,
  notifyClientReservationPending,
} from "@/lib/notify";

const createSchema = z.object({
  serviceId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const list = await prisma.reservation.findMany({
    where: { userId: u.session.sub },
    include: { service: true },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  });

  const enriched = await Promise.all(
    list.map(async (r) => {
      const { start, end } = dayBounds(r.scheduledAt);
      const q =
        r.status === "CONFIRMED" || r.status === "IN_PROGRESS"
          ? await queueInfoForReservation(r, start, end)
          : { positionAhead: 0, estimatedWaitMinutes: 0 };
      return { ...r, queue: q };
    }),
  );

  return NextResponse.json({ reservations: enriched });
}

export async function POST(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, active: true },
  });
  if (!service) return NextResponse.json({ error: "Service introuvable" }, { status: 404 });

  const bh = await getBusinessHours();
  const slotMs = bh.slotMinutes * 60_000;
  const slotStart = new Date(Math.floor(scheduledAt.getTime() / slotMs) * slotMs);
  const slotEnd = new Date(slotStart.getTime() + slotMs);

  const count = await prisma.reservation.count({
    where: {
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      scheduledAt: { gte: slotStart, lt: slotEnd },
    },
  });
  if (count >= SEAT_COUNT) {
    return NextResponse.json({ error: "Ce créneau est complet" }, { status: 409 });
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId: u.session.sub,
      serviceId: service.id,
      scheduledAt: slotStart,
      status: "PENDING",
    },
    include: { service: true, user: true },
  });

  await emitSalonUpdate();

  const when = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(reservation.scheduledAt);

  await notifyClientReservationPending({
    to: reservation.user.email,
    name: reservation.user.name,
    serviceName: reservation.service.name,
    when,
  });

  await notifyAdminNewReservation({
    clientName: reservation.user.name,
    serviceName: reservation.service.name,
    when,
    reservationId: reservation.id,
  });

  return NextResponse.json({ reservation });
}
