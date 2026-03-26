"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTimeFr } from "@/lib/format";
import { SalonSeats } from "@/components/SalonSeats";

type Reservation = {
  id: string;
  status: string;
  scheduledAt: string;
  service: { name: string };
  adminNote?: string | null;
  queue: { positionAhead: number; estimatedWaitMinutes: number };
};

function statusLabel(s: string) {
  const m: Record<string, string> = {
    PENDING: "En attente de validation",
    CONFIRMED: "Confirmée",
    REJECTED: "Refusée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  };
  return m[s] ?? s;
}

export default function ComptePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [prefs, setPrefs] = useState("");
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewMsg, setReviewMsg] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/connexion");
      return;
    }
    setName(me.user.name);
    setEmail(me.user.email);
    setPhone(me.user.phone || "");
    setPrefs(me.user.preferences || "");
    const r = await fetch("/api/reservations");
    const j = await r.json();
    setList(j.reservations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, preferences: prefs }),
    });
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 6) { setPwdMsg("Le nouveau mot de passe doit avoir au moins 6 caractères."); return; }
    setSavingPwd(true);
    setPwdMsg("");
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordChange: { current: curPwd, next: newPwd } }),
    });
    setSavingPwd(false);
    if (r.ok) {
      setPwdMsg("✓ Mot de passe modifié avec succès.");
      setCurPwd(""); setNewPwd("");
    } else {
      const j = await r.json().catch(() => ({}));
      setPwdMsg(j.error || "Erreur lors de la modification.");
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSavingReview(true);
    setReviewMsg("");
    const r = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reviewText, rating: reviewRating }),
    });
    setSavingReview(false);
    if (r.ok) {
      setReviewMsg("✓ Merci pour votre avis ! Il sera visible après validation par le salon.");
      setReviewText("");
      setReviewRating(5);
    } else {
      const j = await r.json().catch(() => ({}));
      setReviewMsg(j.error || "Erreur lors de l'envoi.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function cancel(id: string) {
    if (!confirm("Annuler ce rendez-vous ?")) return;
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-white/60">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl text-white">Mon compte</h1>
          <p className="mt-2 text-white/60">Historique, suivi en direct et préférences.</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-white/30"
        >
          Déconnexion
        </button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Profil</h2>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">E-mail</label>
            <input
              value={email}
              readOnly
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Préférences</label>
            <textarea
              value={prefs}
              onChange={(e) => setPrefs(e.target.value)}
              rows={3}
              placeholder="Allergies, produits, style souhaité…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-[#c9a227] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer"
          >
            Enregistrer
          </button>
        </form>

        <div className="space-y-6">
          {/* Password change */}
          <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Changer le mot de passe</h2>
            {pwdMsg && (
              <p className={`text-sm ${pwdMsg.startsWith("✓") ? "text-emerald-300" : "text-red-300"}`}>{pwdMsg}</p>
            )}
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50">Mot de passe actuel</label>
              <input
                type="password"
                value={curPwd}
                onChange={(e) => setCurPwd(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={6}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
              />
            </div>
            <button
              type="submit"
              disabled={savingPwd}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              {savingPwd ? "Modification…" : "Modifier le mot de passe"}
            </button>
          </form>

          <SalonSeats />
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-white">Mes réservations</h2>
        <div className="mt-4 space-y-3">
          {list.length === 0 && <p className="text-sm text-white/50">Aucune réservation pour le moment.</p>}
          {list.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-white">{r.service.name}</p>
                <p className="text-xs text-white/55">{formatDateTimeFr(r.scheduledAt)}</p>
                <p className="mt-2 text-xs text-white/45">
                  Statut : <span className="text-white/80">{statusLabel(r.status)}</span>
                  {(r.status === "CONFIRMED" || r.status === "IN_PROGRESS") && (
                    <>
                      {" "}
                      — avant vous : <span className="text-[#c9a227]">{r.queue.positionAhead}</span> — attente ~{" "}
                      <span className="text-[#c9a227]">{r.queue.estimatedWaitMinutes} min</span>
                    </>
                  )}
                </p>
                {r.status === "REJECTED" && r.adminNote && (
                  <p className="mt-1 text-xs text-red-300/90">Motif : {r.adminNote}</p>
                )}
              </div>
              {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                <button
                  type="button"
                  onClick={() => cancel(r.id)}
                  className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                >
                  Annuler
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leave a review */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-white">Laisser un avis</h2>
        <form onSubmit={submitReview} className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 max-w-lg">
          {reviewMsg && (
            <p className={`text-sm ${reviewMsg.startsWith("✓") ? "text-emerald-300" : "text-red-300"}`}>{reviewMsg}</p>
          )}
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Note</label>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setReviewRating(n)}
                  className={`text-2xl transition-all cursor-pointer ${n <= reviewRating ? "text-[#c9a227]" : "text-white/15 hover:text-white/30"}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Votre avis</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              required
              minLength={3}
              rows={3}
              placeholder="Partagez votre expérience…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <button type="submit" disabled={savingReview}
            className="rounded-full bg-[#c9a227] px-5 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer disabled:opacity-60">
            {savingReview ? "Envoi…" : "Envoyer mon avis"}
          </button>
        </form>
      </div>
    </div>
  );
}
