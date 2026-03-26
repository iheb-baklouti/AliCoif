import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  preferences: z.string().nullable().optional(),
  passwordChange: z
    .object({
      current: z.string(),
      next: z.string().min(6),
    })
    .optional(),
});

export async function PATCH(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const phone =
    parsed.data.phone === undefined ? undefined : parsed.data.phone === "" ? null : parsed.data.phone;

  // Handle password change if requested
  if (parsed.data.passwordChange) {
    const bcrypt = await import("bcryptjs");
    const currentUser = await prisma.user.findUnique({ where: { id: u.session.sub } });
    if (!currentUser) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    const ok = await bcrypt.compare(parsed.data.passwordChange.current, currentUser.passwordHash);
    if (!ok) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
    const hash = await bcrypt.hash(parsed.data.passwordChange.next, 10);
    await prisma.user.update({ where: { id: u.session.sub }, data: { passwordHash: hash } });
  }

  const user = await prisma.user.update({
    where: { id: u.session.sub },
    data: {
      name: parsed.data.name,
      phone,
      preferences:
        parsed.data.preferences === undefined
          ? undefined
          : parsed.data.preferences === ""
            ? null
            : parsed.data.preferences,
    },
    select: { id: true, email: true, name: true, phone: true, preferences: true, role: true },
  });
  return NextResponse.json({ user });
}
