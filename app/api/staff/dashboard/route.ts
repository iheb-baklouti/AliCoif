import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { dayBounds } from "@/lib/salon";

export async function GET() {
  const s = await requireStaff();
  if ("error" in s) return s.error;

  const staff = await prisma.user.findUnique({ where: { id: s.session.sub } });
  if (!staff?.seatNumber) {
    return NextResponse.json({ error: "Siège non défini" }, { status: 400 });
  }
  const seat = staff.seatNumber;
  const now = new Date();
  const { start, end } = dayBounds(now);

  const [confirmedToday, inProgressMine, completedMineMonth, pendingGlobal] = await Promise.all([
    prisma.reservation.count({
      where: {
        status: "CONFIRMED",
        scheduledAt: { gte: start, lt: end },
      },
    }),
    prisma.reservation.findFirst({
      where: { status: "IN_PROGRESS", seatNumber: seat },
      include: { user: true, service: true },
    }),
    prisma.reservation.count({
      where: {
        status: "COMPLETED",
        completedById: staff.id,
        updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
    prisma.reservation.count({ where: { status: "PENDING" } }),
  ]);

  const queueToday = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      scheduledAt: { gte: start, lt: end },
    },
    include: { user: true, service: true },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: 20,
  });

  return NextResponse.json({
    seat,
    waitingConfirmedToday: confirmedToday,
    pendingApprovals: pendingGlobal,
    activeOnMySeat: inProgressMine,
    completedThisMonth: completedMineMonth,
    queueToday,
  });
}
