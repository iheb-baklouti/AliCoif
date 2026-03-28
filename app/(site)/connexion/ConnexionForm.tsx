"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

export function ConnexionForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/compte";
  const [email, setEmail] = useState("");
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
    const j = await r.json().catch(() => ({}));
    setLoading(false);
    if (!r.ok) {
      setErr(j.error || "Erreur de connexion Google");
      return;
    }
    const dest = j.user?.role === "ADMIN" || j.user?.role === "STAFF" ? "/dashboard" : next || "/compte";
    router.push(dest);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json().catch(() => ({}));
    setLoading(false);
    if (!r.ok) {
      setErr(j.error || "Erreur de connexion");
      return;
    }
    const dest =
      j.user?.role === "ADMIN" || j.user?.role === "STAFF" ? "/dashboard" : next || "/compte";
    router.push(dest);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {clientId && (
          <GoogleOAuthProvider clientId={clientId}>
            <div className="flex justify-center mb-4">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErr("Échec de la connexion Google")}
                theme="filled_black"
                shape="pill"
                text="continue_with"
                width={250}
              />
            </div>
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-subtle)]" /></div>
              <span className="relative bg-[var(--background)] px-2 text-xs text-[var(--text-muted)] uppercase tracking-widest">OU</span>
            </div>
          </GoogleOAuthProvider>
        )}
        
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
          <label className="text-xs uppercase tracking-wider text-white/50">Mot de passe</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
        </div>
        {err && <p className="text-sm text-red-300">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#c9a227] py-3 text-sm font-semibold text-black transition hover:bg-[#e4c04a] disabled:opacity-60"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/60">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-[#c9a227] hover:underline">
          Créer un compte
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-white/40">
        Admin : <span className="text-white/60">admin@lartiste.tn</span> / <span className="text-white/60">Admin123!</span>
        {" — "}
        Équipe : <span className="text-white/60">staff1@lartiste.tn</span> /{" "}
        <span className="text-white/60">Staff123!</span>
      </p>
    </>
  );
}
