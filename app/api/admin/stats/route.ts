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

  const [
    dayCount,
    weekCount,
    monthCount,
    pendingCount,
    cancelledCount,
    revenueAgg,
    topServices,
    totalClients,
    reservationsLast30,
  ] = await Promise.all([
    prisma.reservation.count({
      where: { status: "COMPLETED", updatedAt: { gte: day } },
    }),
    prisma.reservation.count({
      where: { status: "COMPLETED", updatedAt: { gte: week } },
    }),
    prisma.reservation.count({
      where: { status: "COMPLETED", updatedAt: { gte: month } },
    }),
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count({
      where: { status: "CANCELLED", updatedAt: { gte: month } },
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
    prisma.user.count({ where: { role: "CLIENT" } }),
    // Daily breakdown for chart (last 7 days)
    prisma.reservation.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: week } },
      select: { updatedAt: true },
    }),
  ]);

  const revenueMonthCents = revenueAgg.reduce((acc, r) => acc + r.service.priceCents, 0);
  const avgRevenueCents = monthCount > 0 ? Math.round(revenueMonthCents / monthCount) : 0;

  const services = await prisma.service.findMany({
    where: { id: { in: topServices.map((t) => t.serviceId) } },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const top = topServices.map((t) => ({
    service: serviceMap.get(t.serviceId),
    count: t._count.serviceId,
  }));

  // Build daily chart data for last 7 days
  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = addDays(day, -i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of reservationsLast30) {
    const key = r.updatedAt.toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  }
  const dailyChart = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    clients: {
      day: dayCount,
      week: weekCount,
      month: monthCount,
      total: totalClients,
    },
    revenue: {
      monthCents: revenueMonthCents,
      avgCents: avgRevenueCents,
    },
    pending: pendingCount,
    cancelledMonth: cancelledCount,
    topServices: top,
    dailyChart,
  });
}
