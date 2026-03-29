import { NextResponse } from "next/server";
import { getDaySlots } from "@/lib/slots";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const d = searchParams.get("date");
  if (!d) return NextResponse.json({ error: "date requise" }, { status: 400 });
  const day = new Date(d);
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "date invalide" }, { status: 400 });
  }
  const slots = await getDaySlots(day);
  return NextResponse.json({ slots });
}
