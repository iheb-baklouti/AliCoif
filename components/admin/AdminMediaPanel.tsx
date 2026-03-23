"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type MediaRow = {
  id: string;
  url: string;
  alt: string | null;
  kind: string;
  sortOrder: number;
};

export function AdminMediaPanel() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/media");
    const j = await r.json();
    setItems(j.media ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const r = await fetch("/api/admin/media", { method: "POST", body: fd });
    setLoading(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error || "Échec de l’upload");
      return;
    }
    setMsg("Image ajoutée.");
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function updateRow(id: string, patch: Partial<Pick<MediaRow, "kind" | "sortOrder" | "alt">>) {
    await fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce média ?")) return;
    await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mt-10 space-y-10">
      <form
        onSubmit={onUpload}
        className="max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 className="text-lg font-semibold text-white">Ajouter une image</h2>
        <p className="text-xs text-white/50">JPG, PNG, WebP ou GIF — max 5 Mo. Stockage : /public/uploads/</p>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Fichier</label>
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            className="mt-2 block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-[#c9a227] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Usage</label>
            <select
              name="kind"
              defaultValue="GALLERY"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            >
              <option value="HERO">Accueil (hero)</option>
              <option value="EQUIPE">Page équipe</option>
              <option value="GALLERY">Galerie</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Ordre (0 = premier)</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={0}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Texte alternatif (SEO)</label>
          <input
            name="alt"
            placeholder="Description courte"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#c9a227] px-5 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Uploader"}
        </button>
        {msg && <p className="text-sm text-white/70">{msg}</p>}
      </form>

      <div>
        <h2 className="text-lg font-semibold text-white">Bibliothèque</h2>
        <p className="mt-1 text-xs text-white/50">
          Les images « Accueil » et « Équipe » sont triées par ordre. Les fichiers dans /public/ (ex. salon-facade.png)
          ne sont pas supprimés du disque si vous retirez seulement la ligne en base — supprimez-les à la main si
          besoin.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg shadow-black/20"
            >
              <div className="relative aspect-[16/10] bg-black/50">
                <Image src={m.url} alt={m.alt || ""} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <select
                    key={`${m.id}-${m.kind}`}
                    defaultValue={m.kind}
                    onChange={(e) => updateRow(m.id, { kind: e.target.value })}
                    className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-white"
                  >
                    <option value="HERO">HERO</option>
                    <option value="EQUIPE">EQUIPE</option>
                    <option value="GALLERY">GALLERY</option>
                  </select>
                  <input
                    key={`${m.id}-o-${m.sortOrder}`}
                    type="number"
                    defaultValue={m.sortOrder}
                    onBlur={(e) => updateRow(m.id, { sortOrder: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-white"
                    title="Ordre"
                  />
                </div>
                <input
                  key={`${m.id}-alt`}
                  defaultValue={m.alt ?? ""}
                  onBlur={(e) => updateRow(m.id, { alt: e.target.value.trim() || null })}
                  placeholder="Alt"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
                />
                <p className="truncate text-[10px] text-white/35">{m.url}</p>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="text-xs font-semibold text-red-300 hover:text-red-200"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
