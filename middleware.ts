import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return NextResponse.next();

  const token = request.cookies.get("lartiste_token")?.value;
  const key = new TextEncoder().encode(secret);

  const verify = async () => {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, key);
      return payload;
    } catch {
      return null;
    }
  };

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const payload = await verify();
    const role = payload?.role;
    if (!payload || (role !== "ADMIN" && role !== "STAFF")) {
      const u = new URL("/connexion", request.url);
      u.searchParams.set("next", "/dashboard");
      return NextResponse.redirect(u);
    }
  }

  if (request.nextUrl.pathname.startsWith("/compte")) {
    const payload = await verify();
    if (!payload) {
      const u = new URL("/connexion", request.url);
      u.searchParams.set("next", "/compte");
      return NextResponse.redirect(u);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/compte/:path*"],
};
