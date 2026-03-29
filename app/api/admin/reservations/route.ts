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

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  const [total, reservations] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: { user: true, service: true },
      orderBy: { scheduledAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    reservations,
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}
