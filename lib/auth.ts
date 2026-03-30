import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const COOKIE = "lartiste_token";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET manquant");
  return new TextEncoder().encode(s);
}

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  /** Siège coiffeur (JWT), aligné sur User.seatNumber pour STAFF */
  seatNumber: number | null;
};

function parseRole(r: unknown): Role {
  if (r === "ADMIN" || r === "STAFF" || r === "CLIENT") return r;
  return "CLIENT";
}

export async function signToken(payload: JwtPayload, expiresIn = "7d") {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    seatNumber: payload.seatNumber ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const role = parseRole(payload.role);
    const seatRaw = payload.seatNumber;
    const seatNumber =
      typeof seatRaw === "number"
        ? seatRaw
        : typeof seatRaw === "string"
          ? Number.parseInt(seatRaw, 10)
          : null;
    if (!sub || !email) return null;
    return {
      sub,
      email,
      role,
      seatNumber: Number.isFinite(seatNumber as number) ? (seatNumber as number) : null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JwtPayload | null> {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (!t) return null;
  return verifyToken(t);
}

export async function setAuthCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
