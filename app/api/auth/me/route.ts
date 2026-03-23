import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      seatNumber: true,
      preferences: true,
    },
  });
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
