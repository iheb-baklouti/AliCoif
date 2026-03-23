"use client";

import { useState } from "react";
import { SALON, osmEmbedSrc } from "@/lib/site";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      message: String(fd.get("message") || ""),
    };
    setStatus("idle");
    const r = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setStatus(r.ok ? "ok" : "err");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-white">Contact</h1>
      <p className="mt-4 max-w-2xl text-lg text-white/65">
        Une question ? Un projet de coupe ? Écrivez-nous — réponse rapide par téléphone ou WhatsApp. Salon à{" "}
        <strong className="font-medium text-white/85">{SALON.city}</strong>, {SALON.country}.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Nom</label>
            <input
              name="name"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-[#c9a227]/0 transition focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">E-mail</label>
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Téléphone</label>
            <input
              name="phone"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50">Message</label>
            <textarea
              name="message"
              required
              rows={5}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-[#c9a227] py-3 text-sm font-semibold text-black transition hover:bg-[#e4c04a]"
          >
            Envoyer
          </button>
          {status === "ok" && <p className="text-sm text-emerald-300">Message envoyé.</p>}
          {status === "err" && <p className="text-sm text-red-300">Erreur d&apos;envoi. Réessayez.</p>}
        </form>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-wider text-white/50">Téléphone</p>
            <a href={`tel:${SALON.phoneTel}`} className="mt-2 block text-lg font-semibold text-white hover:text-[#c9a227]">
              {SALON.phoneDisplay}
            </a>
            <a
              href={`https://wa.me/${SALON.phoneTel.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-full border border-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
            >
              WhatsApp
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              title={`Carte — ${SALON.name}`}
              className="h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={osmEmbedSrc()}
            />
            <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/55">
                {SALON.city} — repère approximatif (OpenStreetMap). Itinéraire détaillé sur Yandex Maps.
              </p>
              <a
                href={SALON.yandexOrgUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 text-xs font-semibold text-[#c9a227] hover:underline"
              >
                Ouvrir sur Yandex Maps →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
