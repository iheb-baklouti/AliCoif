import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const now = new Date();
  const day = startOfDay(now);
  const week = addDays(day, -7);
  const month = addDays(day, -30);

  const [dayCount, weekCount, monthCount, revenueAgg, topServices] = await Promise.all([
    prisma.reservation.count({
      where: { status: "COMPLETED", updatedAt: { gte: day } },
    }),
    prisma.reservation.count({
      where: { status: "COMPLETED", updatedAt: { gte: week } },
    }),
    prisma.reservation.count({
      where: { status: "COMPLETED", updatedAt: { gte: month } },
    }),
    prisma.reservation.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: month } },
      include: { service: true },
    }),
    prisma.reservation.groupBy({
      by: ["serviceId"],
      where: { status: "COMPLETED", updatedAt: { gte: month } },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5,
    }),
  ]);

  const revenueMonthCents = revenueAgg.reduce((acc, r) => acc + r.service.priceCents, 0);

  const services = await prisma.service.findMany({
    where: { id: { in: topServices.map((t) => t.serviceId) } },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const top = topServices.map((t) => ({
    service: serviceMap.get(t.serviceId),
    count: t._count.serviceId,
  }));

  return NextResponse.json({
    clients: {
      day: dayCount,
      week: weekCount,
      month: monthCount,
    },
    revenue: {
      monthCents: revenueMonthCents,
    },
    topServices: top,
  });
}
