import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const extForMime: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const items = await prisma.mediaAsset.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json({ media: items });
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "GALLERY");
  const alt = form.get("alt") ? String(form.get("alt")) : null;
  const sortOrderRaw = form.get("sortOrder");
  const sortOrder = sortOrderRaw != null ? Number(sortOrderRaw) : 0;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!["HERO", "EQUIPE", "GALLERY"].includes(kind)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 400 });
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Format non autorisé (jpg, png, webp, gif)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extForMime[mime] ?? (path.extname(file.name) || ".bin");
  const name = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, name);
  await writeFile(fsPath, buf);

  const url = `/uploads/${name}`;
  const row = await prisma.mediaAsset.create({
    data: { url, alt, kind, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 },
  });

  return NextResponse.json({ media: row });
}
