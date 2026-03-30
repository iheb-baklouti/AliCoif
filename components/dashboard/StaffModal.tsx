"use client";

import { useEffect, useRef, useState } from "react";

export type StaffModalMode = "add" | "edit" | "delete";

export interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  seatNumber: number;
}

interface Props {
  mode: StaffModalMode;
  initial?: Partial<StaffFormData> & { id?: string };
  targetName?: string;
  onConfirm: (data: StaffFormData) => Promise<void>;
  onClose: () => void;
}

export function StaffModal({ mode, initial, targetName, onConfirm, onClose }: Props) {
  const [form, setForm] = useState<StaffFormData>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    password: "",
    seatNumber: initial?.seatNumber ?? 1,
  });
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
    mode === "add" ? "Ajouter un membre staff" :
    mode === "edit" ? "Modifier le membre staff" :
    "Supprimer le membre";

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
            {mode === "delete" ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9a227]/15 text-[#c9a227]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
            )}
            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={mode === "delete" ? handleSubmit : handleSubmit} className="p-6 space-y-4">
          {mode === "delete" ? (
            <p className="text-sm text-white/70">
              Êtes-vous sûr de vouloir supprimer{" "}
              <span className="font-semibold text-white">{targetName}</span> ?
              Cette action est irréversible.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="staff-name" className="block text-xs font-medium uppercase tracking-wider text-white/60 mb-1.5">Nom complet *</label>
                  <input
                    id="staff-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                    placeholder="Ali Ben Ahmed"
                  />
                </div>
                <div>
                  <label htmlFor="staff-seat" className="block text-xs font-medium uppercase tracking-wider text-white/60 mb-1.5">Siège</label>
                  <select
                    id="staff-seat"
                    value={form.seatNumber}
                    onChange={(e) => setForm((s) => ({ ...s, seatNumber: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n} className="bg-[#0d0d0d]">Siège {n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="staff-email" className="block text-xs font-medium uppercase tracking-wider text-white/60 mb-1.5">E-mail *</label>
                <input
                  id="staff-email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                  placeholder="staff@artiste.tn"
                />
              </div>
              <div>
                <label htmlFor="staff-phone" className="block text-xs font-medium uppercase tracking-wider text-white/60 mb-1.5">Téléphone</label>
                <input
                  id="staff-phone"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                  placeholder="+216 XX XXX XXX"
                />
              </div>
              <div>
                <label htmlFor="staff-password" className="block text-xs font-medium uppercase tracking-wider text-white/60 mb-1.5">
                  {mode === "edit" ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe *"}
                </label>
                <input
                  id="staff-password"
                  required={mode === "add"}
                  type="password"
                  minLength={mode === "add" ? 6 : undefined}
                  value={form.password}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 transition"
                  placeholder={mode === "edit" ? "••••••••" : "Min. 6 caractères"}
                />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-60 ${
                mode === "delete"
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-[#c9a227] text-black hover:bg-[#e4c04a]"
              }`}
            >
              {loading ? "…" : mode === "add" ? "Ajouter" : mode === "edit" ? "Enregistrer" : "Supprimer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
