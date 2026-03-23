import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const staffList = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { seatNumber: "asc" },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const stats = await Promise.all(
    staffList.map(async (u) => {
      const [completedMonth, completedTotal] = await Promise.all([
        prisma.reservation.count({
          where: { completedById: u.id, status: "COMPLETED", updatedAt: { gte: monthStart } },
        }),
        prisma.reservation.count({
          where: { completedById: u.id, status: "COMPLETED" },
        }),
      ]);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        seatNumber: u.seatNumber,
        completedThisMonth: completedMonth,
        completedTotal,
      };
    }),
  );

  return NextResponse.json({ team: stats });
}
