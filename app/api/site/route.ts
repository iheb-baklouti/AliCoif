import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const hero = await prisma.setting.findUnique({ where: { key: "hero_video" } });
  return NextResponse.json({
    heroVideoUrl: hero?.value ?? "",
  });
}
