"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

export default function InscriptionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  async function handleGoogleSuccess(credentialResponse: any) {
    if (!credentialResponse.credential) return;
    setErr(null);
    setLoading(true);
    const r = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: credentialResponse.credential }),
    });
    setLoading(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error || "Erreur de connexion Google");
      return;
    }
    router.push("/compte");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone: phone || undefined }),
    });
    setLoading(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error || "Erreur");
      return;
    }
    router.push("/compte");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-white">Inscription</h1>
      <p className="mt-3 text-sm text-white/60">Créez votre compte pour réserver et suivre en direct.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {clientId && (
          <GoogleOAuthProvider clientId={clientId}>
            <div className="flex justify-center mb-4">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErr("Échec de la connexion Google")}
                theme="filled_black"
                shape="pill"
                text="signup_with"
                width={250}
              />
            </div>
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <span className="relative bg-[#0d0d0d] px-2 text-xs text-white/40 uppercase tracking-widest">OU</span>
            </div>
          </GoogleOAuthProvider>
        )}

        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Nom complet</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">E-mail</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Téléphone (optionnel)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Mot de passe</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
        </div>
        {err && <p className="text-sm text-red-300">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#c9a227] py-3 text-sm font-semibold text-black transition hover:bg-[#e4c04a] disabled:opacity-60"
        >
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/60">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-[#c9a227] hover:underline">
          Connexion
        </Link>
      </p>
    </div>
  );
}
