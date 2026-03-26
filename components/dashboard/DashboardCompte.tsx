"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/dashboard/Toast";

type Me = { name: string; email: string; phone: string | null; role: string };

export function DashboardCompte() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [prefs, setPrefs] = useState("");
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMe(d.user);
          setName(d.user.name);
          setPhone(d.user.phone || "");
          setPrefs(d.user.preferences || "");
        }
      });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, preferences: prefs }),
    });
    setSaving(false);
    if (r.ok) {
      showToast("success", "Profil enregistré ✓");
      setMe((m) => m ? { ...m, name, phone: phone || null } : m);
    } else {
      showToast("error", "Erreur lors de la sauvegarde.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 6) { showToast("error", "Le nouveau mot de passe doit avoir au moins 6 caractères."); return; }
    setSavingPwd(true);
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassword: { current: curPwd, next: newPwd } }),
    });
    setSavingPwd(false);
    if (r.ok) {
      showToast("success", "Mot de passe modifié ✓");
      setCurPwd(""); setNewPwd("");
    } else {
      const j = await r.json().catch(() => ({}));
      showToast("error", j.error || "Erreur.");
    }
  }

  if (!me) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-[#c9a227]">Profil</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">Mon compte</h1>
      </div>

      {/* Profile form */}
      <form onSubmit={saveProfile} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Informations personnelles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">E-mail</label>
            <input
              value={me.email}
              readOnly
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 XX XXX XXX"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Préférences</label>
            <input
              value={prefs}
              onChange={(e) => setPrefs(e.target.value)}
              placeholder="Style, produits, allergies…"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#c9a227] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      {/* Password change */}
      <form onSubmit={changePassword} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Changer le mot de passe</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Mot de passe actuel</label>
            <input
              type="password"
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={savingPwd}
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        >
          {savingPwd ? "Modification…" : "Modifier le mot de passe"}
        </button>
      </form>
    </div>
  );
}
