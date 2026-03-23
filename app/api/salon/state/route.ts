import { NextResponse } from "next/server";
import { buildSalonSnapshot } from "@/lib/salon";

export async function GET() {
  const snapshot = await buildSalonSnapshot();
  return NextResponse.json(snapshot);
}
