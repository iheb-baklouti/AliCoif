import Link from "next/link";
import { SALON } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--text-main)]">L&apos;Artiste</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Salon de coiffure — élégance &amp; précision.</p>
        </div>
        <div className="space-y-2 text-sm text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-main)]">Contact</p>
          <a href={`tel:${SALON.phoneTel}`} className="block hover:text-[#c9a227]">
            {SALON.phoneDisplay}
          </a>
          <a
            href={`https://wa.me/${SALON.phoneTel.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="block hover:text-[#c9a227]"
          >
            WhatsApp
          </a>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-[var(--text-main)]">Liens</p>
          <div className="flex flex-col gap-2 text-[var(--text-muted)]">
            <Link href="/services" className="hover:text-[#c9a227]">
              Services &amp; tarifs
            </Link>
            <Link href="/reservation" className="hover:text-[#c9a227]">
              Réserver
            </Link>
            <Link href="/contact" className="hover:text-[#c9a227]">
              Nous trouver
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border-subtle)] py-6 text-center text-xs text-[var(--text-muted)]">
        © {new Date().getFullYear()} L&apos;Artiste by Ali Chakroun
      </div>
    </footer>
  );
}
