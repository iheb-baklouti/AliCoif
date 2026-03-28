import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signToken } from "@/lib/auth";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();
    if (!credential) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Token invalide" }, { status: 400 });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || "Client";

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Connect first time -> Creating an account automatically
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: "CLIENT",
          // random hash since they login via google
          passwordHash: Math.random().toString(36).substring(7),
        },
      });
    }

    // Sign complete custom JWT
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      seatNumber: user.seatNumber || null,
    });
    
    // Set the cookie
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[google auth error]", error);
    return NextResponse.json({ error: "Erreur d'authentification Google" }, { status: 500 });
  }
}
