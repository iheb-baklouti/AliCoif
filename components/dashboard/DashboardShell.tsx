"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type Me = { name: string; role: string; seatNumber: number | null };

const adminLinks: { tab: string; label: string }[] = [
  { tab: "dash", label: "Vue d'ensemble" },
  { tab: "res", label: "Réservations" },
  { tab: "equipe", label: "Équipe & perfs" },
  { tab: "clients", label: "Clients" },
  { tab: "services", label: "Services" },
  { tab: "settings", label: "Paramètres" },
  { tab: "media", label: "Médias" },
  { tab: "reviews", label: "Avis" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "dash";
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user && (d.user.role === "ADMIN" || d.user.role === "STAFF")) {
          setMe(d.user);
        } else {
          router.replace("/connexion?next=/dashboard");
        }
      })
      .catch(() => router.replace("/connexion"));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070707] text-white/60">
        Chargement…
      </div>
    );
  }

  const isStaff = me.role === "STAFF";

  function hrefFor(t: string) {
    return `/dashboard?tab=${encodeURIComponent(t)}`;
  }

  return (
    <div className="flex min-h-screen bg-[#070707] text-white">
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#050505]">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[#c9a227]">L&apos;Artiste</p>
          <p className="mt-1 text-xs text-white/45">
            {isStaff ? `Siège ${me.seatNumber ?? "—"}` : "Administration"}
          </p>
          <p className="mt-2 truncate text-sm text-white/80">{me.name}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {isStaff ? (
            <Link
              href={hrefFor("staff")}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                tab === "staff" ? "bg-[#c9a227]/20 text-[#f0e6b8]" : "text-white/70 hover:bg-white/5"
              }`}
            >
              Mon poste
            </Link>
          ) : (
            adminLinks.map((l) => (
              <Link
                key={l.tab}
                href={hrefFor(l.tab)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  tab === l.tab ? "bg-[#c9a227]/20 text-[#f0e6b8]" : "text-white/70 hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            ))
          )}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <div className="pb-1">
            <ThemeToggle />
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/5"
          >
            Ouvrir le site client ↗
          </a>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/50 hover:bg-white/5 hover:text-white/80"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <div className="min-h-screen flex-1 overflow-auto">{children}</div>
    </div>
  );
}
