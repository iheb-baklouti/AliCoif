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

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  const valid = ["PENDING", "CONFIRMED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const statusFilter = status && valid.includes(status) ? { status: status as "PENDING" | "CONFIRMED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" } : {};
  const where = { userId: u.session.sub, ...statusFilter };

  const [total, list] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: { service: true },
      orderBy: { scheduledAt: "desc" },
      skip,
      take: limit,
    })
  ]);

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

  return NextResponse.json({ 
    reservations: enriched,
    total,
    pages: Math.ceil(total / limit),
    page,
  });
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
    timeZone: "Africa/Tunis",
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
