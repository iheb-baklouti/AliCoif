import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const valid = ["PENDING", "CONFIRMED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const where =
    status && valid.includes(status)
      ? {
          status: status as
            | "PENDING"
            | "CONFIRMED"
            | "REJECTED"
            | "IN_PROGRESS"
            | "COMPLETED"
            | "CANCELLED",
        }
      : {};

  const reservations = await prisma.reservation.findMany({
    where,
    include: { user: true, service: true },
    orderBy: { scheduledAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ reservations });
}
