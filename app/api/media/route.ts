import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  if (!kind || !["HERO", "EQUIPE", "GALLERY"].includes(kind)) {
    return NextResponse.json({ error: "kind requis (HERO|EQUIPE|GALLERY)" }, { status: 400 });
  }
  const media = await prisma.mediaAsset.findMany({
    where: { kind },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ media });
}
