"use client";

import { useEffect, useRef, useState } from "react";

export interface ServiceFormData {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  category: string;
  active: boolean;
}

export type ServiceModalMode = "add" | "edit" | "delete";

interface Props {
  mode: ServiceModalMode;
  initial?: Partial<ServiceFormData> & { id?: string };
  targetName?: string;
  onConfirm: (data: ServiceFormData) => Promise<void>;
  onClose: () => void;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ServiceModal({ mode, initial, targetName, onConfirm, onClose }: Props) {
  const [form, setForm] = useState<ServiceFormData>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    priceCents: initial?.priceCents ?? 1000,
    durationMinutes: initial?.durationMinutes ?? 30,
    category: initial?.category ?? "",
    active: initial?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!initial?.slug);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleNameChange(name: string) {
    setForm((s) => ({ ...s, name }));
    if (autoSlug) setForm((s) => ({ ...s, slug: slugify(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(form);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "add" ? "Ajouter un service" :
    mode === "edit" ? "Modifier le service" :
    "Supprimer le service";

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${mode === "delete" ? "bg-red-500/15 text-red-300" : "bg-[#c9a227]/15 text-[#c9a227]"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </span>
            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === "delete" ? (
            <p className="text-sm text-white/70">
              Êtes-vous sûr de vouloir supprimer le service{" "}
              <span className="font-semibold text-white">{targetName}</span> ?
              S&apos;il a des réservations, il sera désactivé au lieu d&apos;être supprimé.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-1.5">Nom *</label>
                  <input required value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                    placeholder="Coupe classique" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-1.5">Slug *</label>
                  <input required value={form.slug}
                    onChange={(e) => { setForm((s) => ({ ...s, slug: e.target.value })); setAutoSlug(false); }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                    placeholder="coupe-classique" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-1.5">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                  placeholder="Description du service…" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-1.5">Prix (TND)</label>
                  <input type="number" step="0.01" min="0" required
                    value={(form.priceCents / 100).toFixed(2)}
                    onChange={(e) => setForm((s) => ({ ...s, priceCents: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-1.5">Durée (min)</label>
                  <input type="number" min="5" required value={form.durationMinutes}
                    onChange={(e) => setForm((s) => ({ ...s, durationMinutes: Number(e.target.value) || 30 }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/50 mb-1.5">Catégorie</label>
                  <input value={form.category}
                    onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                    placeholder="Coupes" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" checked={form.active}
                  onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))}
                  className="cursor-pointer" />
                Service actif (visible aux clients)
              </label>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors cursor-pointer">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-60 ${
                mode === "delete" ? "bg-red-600 text-white hover:bg-red-500" : "bg-[#c9a227] text-black hover:bg-[#e4c04a]"
              }`}>
              {loading ? "…" : mode === "add" ? "Ajouter" : mode === "edit" ? "Enregistrer" : "Supprimer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
