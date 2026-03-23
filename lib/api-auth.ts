import { NextResponse } from "next/server";
import type { JwtPayload } from "./auth";
import { getSession } from "./auth";

export async function requireUser() {
  const s = await getSession();
  if (!s) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  return { session: s };
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  if (s.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  return { session: s };
}

export async function requireStaff() {
  const s = await getSession();
  if (!s) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  if (s.role !== "STAFF") {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  return { session: s };
}

/** Admin ou membre d’équipe (dashboard) */
export async function requireDashboardUser(): Promise<
  { session: JwtPayload } | { error: NextResponse }
> {
  const s = await getSession();
  if (!s) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  if (s.role !== "ADMIN" && s.role !== "STAFF") {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  return { session: s };
}
