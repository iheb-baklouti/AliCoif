"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Services" },
  { href: "/equipe", label: "L'équipe" },
  { href: "/contact", label: "Contact" },
  { href: "/reservation", label: "Réserver" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser({ name: d.user.name, role: d.user.role });
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[color:var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--text-main)] md:text-3xl">
            L&apos;Artiste
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a227] sm:inline">
            by Ali Chakroun
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition hover:text-[#c9a227] ${
                pathname === l.href ? "text-[#c9a227]" : "text-[var(--text-muted)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/compte"
                className="text-sm font-medium text-[var(--text-muted)] transition hover:text-[#c9a227]"
              >
                Mon compte
              </Link>
              {(user.role === "ADMIN" || user.role === "STAFF") && (
                <Link
                  href="/dashboard"
                  className="rounded-full border border-[#c9a227]/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#c9a227] transition hover:bg-[#c9a227]/10"
                >
                  Dashboard
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/connexion"
              className="rounded-full bg-[#c9a227] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e4c04a]"
            >
              Connexion
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-main)] md:hidden"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-lg">{open ? "×" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="pb-2">
              <ThemeToggle />
            </div>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-[var(--text-main)]"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/compte" onClick={() => setOpen(false)} className="text-sm text-[var(--text-main)]">
                  Mon compte
                </Link>
                {(user.role === "ADMIN" || user.role === "STAFF") && (
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="text-sm text-[#c9a227]">
                    Dashboard
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/connexion"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[#c9a227] px-4 py-2 text-center text-sm font-semibold text-black"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
