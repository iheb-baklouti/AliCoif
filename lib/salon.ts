import type { Reservation, Service } from "@prisma/client";
import { prisma } from "./prisma";

export const SEAT_COUNT = 5;

export type SeatView = {
  seatNumber: number;
  status: "available" | "occupied";
  clientName: string | null;
  remainingMinutes: number | null;
  reservationId: string | null;
};

export type SalonSnapshot = {
  seats: SeatView[];
  updatedAt: string;
};

function firstName(full: string) {
  const p = full.trim().split(/\s+/)[0];
  return p || "Client";
}

function remainingFor(startedAt: Date, durationMinutes: number): number {
  const end = startedAt.getTime() + durationMinutes * 60_000;
  const left = Math.ceil((end - Date.now()) / 60_000);
  return Math.max(0, left);
}

export async function buildSalonSnapshot(): Promise<SalonSnapshot> {
  const active = await prisma.reservation.findMany({
    where: { status: "IN_PROGRESS", seatNumber: { not: null } },
    include: { user: true, service: true },
  });

  const bySeat = new Map<number, (typeof active)[0]>();
  for (const r of active) {
    if (r.seatNumber != null) bySeat.set(r.seatNumber, r);
  }

  const seats: SeatView[] = [];
  for (let n = 1; n <= SEAT_COUNT; n++) {
    const r = bySeat.get(n);
    if (!r || !r.startedAt) {
      seats.push({
        seatNumber: n,
        status: "available",
        clientName: null,
        remainingMinutes: null,
        reservationId: null,
      });
      continue;
    }
    const rem = remainingFor(r.startedAt, r.service.durationMinutes);
    seats.push({
      seatNumber: n,
      status: "occupied",
      clientName: firstName(r.user.name),
      remainingMinutes: rem,
      reservationId: r.id,
    });
  }

  return { seats, updatedAt: new Date().toISOString() };
}

export type QueueInfo = {
  positionAhead: number;
  estimatedWaitMinutes: number;
};

/** File des RDV confirmés le même jour (avant prise en charge / autre créneau). */
export async function queueInfoForReservation(
  res: Reservation & { service: Service },
  dayStart: Date,
  dayEnd: Date,
): Promise<QueueInfo> {
  const queued = await prisma.reservation.findMany({
    where: {
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: "CONFIRMED",
    },
    include: { service: true },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
  });
  const idx = queued.findIndex((r) => r.id === res.id);
  const ahead = idx < 0 ? [] : queued.slice(0, idx);
  const wait = ahead.reduce((acc, r) => acc + r.service.durationMinutes, 0);
  return {
    positionAhead: ahead.length,
    estimatedWaitMinutes: wait,
  };
}

export function dayBounds(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
