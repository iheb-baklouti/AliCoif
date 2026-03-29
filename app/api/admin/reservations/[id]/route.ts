import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { emitSalonUpdate } from "@/lib/realtime";
import { SEAT_COUNT } from "@/lib/salon";
import {
  notifyClientReservationConfirmed,
  notifyClientReservationRejected,
  notifyClientRescheduled,
} from "@/lib/notify";

async function staffUserIdForSeat(seat: number) {
  const u = await prisma.user.findFirst({
    where: { role: "STAFF", seatNumber: seat },
  });
  return u?.id ?? null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.reservation.findUnique({
    where: { id },
    include: { user: true, service: true },
  });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (body.action === "approve") {
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Seules les demandes en attente peuvent être acceptées" }, { status: 400 });
    }
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "CONFIRMED", adminNote: null },
      include: { user: true, service: true },
    });
    const when = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Tunis",
    }).format(updated.scheduledAt);
    await notifyClientReservationConfirmed({
      to: updated.user.email,
      name: updated.user.name,
      serviceName: updated.service.name,
      when,
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  if (body.action === "reject") {
    if (existing.status !== "PENDING" && existing.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Statut incompatible" }, { status: 400 });
    }
    const adminNote = typeof body.adminNote === "string" ? body.adminNote : null;
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "REJECTED", adminNote },
      include: { user: true, service: true },
    });
    await notifyClientReservationRejected({
      to: updated.user.email,
      name: updated.user.name,
      reason: adminNote,
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  if (body.action === "reschedule") {
    const scheduledRaw = body.scheduledAt;
    if (typeof scheduledRaw !== "string") {
      return NextResponse.json({ error: "scheduledAt requis (ISO)" }, { status: 400 });
    }
    const scheduledAt = new Date(scheduledRaw);
    const adminNote = typeof body.adminNote === "string" ? body.adminNote : null;
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        scheduledAt,
        status: "CONFIRMED",
        adminNote,
      },
      include: { user: true, service: true },
    });
    const when = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Tunis",
    }).format(updated.scheduledAt);
    await notifyClientRescheduled({
      to: updated.user.email,
      name: updated.user.name,
      serviceName: updated.service.name,
      when,
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  const nextStatus = body.status as string | undefined;
  const seatNum = body.seatNumber as number | null | undefined;
  let nextSeat = seatNum === undefined ? existing.seatNumber : seatNum;
  let nextStarted = body.startedAt !== undefined ? (body.startedAt as string | null) : existing.startedAt?.toISOString() ?? null;

  if (nextStatus === "IN_PROGRESS") {
    if (existing.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Le RDV doit être confirmé avant d’occuper un siège" }, { status: 400 });
    }
    if (nextSeat == null || nextSeat < 1 || nextSeat > SEAT_COUNT) {
      return NextResponse.json({ error: "Numéro de siège requis (1–5)" }, { status: 400 });
    }
    if (!nextStarted) nextStarted = new Date().toISOString();
    const staffUserId = await staffUserIdForSeat(nextSeat);
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        seatNumber: nextSeat,
        startedAt: new Date(nextStarted),
        staffUserId,
      },
      include: { user: true, service: true },
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  if (nextStatus === "COMPLETED") {
    // Use the staff member who was serving (staffUserId) for stats attribution
    const completedBy = existing.staffUserId ?? a.session.sub;
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        seatNumber: null,
        startedAt: null,
        staffUserId: null,
        completedById: completedBy,
      },
      include: { user: true, service: true },
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  if (nextStatus === "CANCELLED") {
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        seatNumber: null,
        startedAt: null,
        staffUserId: null,
      },
      include: { user: true, service: true },
    });
    await emitSalonUpdate();
    return NextResponse.json({ reservation: updated });
  }

  return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
}
