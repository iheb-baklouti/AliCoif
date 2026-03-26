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
      .then((d) => { if (d.user) setUser({ name: d.user.name, role: d.user.role }); else setUser(null); })
      .catch(() => setUser(null));
  }, [pathname]);

  const isDashboardUser = user?.role === "ADMIN" || user?.role === "STAFF";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[color:var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        {/* Logo */}
        <Link href="/" className="group flex items-baseline gap-2 cursor-pointer">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--text-main)] md:text-3xl transition-opacity group-hover:opacity-80">
            L&apos;Artiste
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a227] sm:inline">
            by Ali Chakroun
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-[#c9a227] cursor-pointer ${
                pathname === l.href ? "text-[#c9a227]" : "text-[var(--text-muted)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
          {user ? (
            <>
              {isDashboardUser ? (
                <Link
                  href="/dashboard?tab=compte"
                  className="text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[#c9a227] cursor-pointer"
                >
                  Mon compte
                </Link>
              ) : (
                <Link
                  href="/compte"
                  className="text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[#c9a227] cursor-pointer"
                >
                  Mon compte
                </Link>
              )}
              {isDashboardUser && (
                <Link
                  href="/dashboard"
                  className="rounded-full border border-[#c9a227]/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#c9a227] transition-all hover:bg-[#c9a227]/10 hover:border-[#c9a227]/70 active:scale-95 cursor-pointer"
                >
                  Dashboard
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/connexion"
              className="rounded-full bg-[#c9a227] px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-[#e4c04a] active:scale-95 cursor-pointer shadow-md shadow-[#c9a227]/20"
            >
              Connexion
            </Link>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--surface-soft)] transition-colors cursor-pointer md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="pb-1">
              <ThemeToggle />
            </div>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`text-sm font-medium transition-colors hover:text-[#c9a227] cursor-pointer ${
                  pathname === l.href ? "text-[#c9a227]" : "text-[var(--text-main)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href={isDashboardUser ? "/dashboard?tab=compte" : "/compte"}
                  onClick={() => setOpen(false)}
                  className="text-sm text-[var(--text-main)] hover:text-[#c9a227] cursor-pointer transition-colors"
                >
                  Mon compte
                </Link>
                {isDashboardUser && (
                  <Link href="/dashboard" onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-[#c9a227] cursor-pointer">
                    Dashboard
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/connexion"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[#c9a227] px-4 py-2 text-center text-sm font-semibold text-black cursor-pointer hover:bg-[#e4c04a] transition-colors"
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
