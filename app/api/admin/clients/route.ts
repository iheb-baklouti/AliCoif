import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {},
    include: {
      _count: { select: { reservations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ clients: users });
}
