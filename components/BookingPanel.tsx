"use client";

import type { Service } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatTimeShort } from "@/lib/format";

export function BookingPanel({ services }: { services: Service[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const dayIso = useMemo(() => {
    const d = new Date(`${day}T12:00:00`);
    return d.toISOString();
  }, [day]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      const r = await fetch(`/api/slots?date=${encodeURIComponent(dayIso)}`);
      const j = await r.json();
      if (!cancelled && r.ok) {
        setSlots(j.slots ?? []);
        setSlot(null);
      }
      if (!cancelled) setSlotsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dayIso]);

  async function submit() {
    setMsg(null);
    if (!serviceId || !slot) {
      setMsg("Choisissez un service et un créneau.");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, scheduledAt: slot }),
    });
    setLoading(false);
    if (r.status === 401) {
      setMsg("Connectez-vous pour réserver.");
      router.push(`/connexion?next=${encodeURIComponent("/reservation")}`);
      return;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "Impossible d’envoyer la demande.");
      return;
    }
    setMsg("Demande envoyée : en attente de validation du salon. Vous serez notifié par e-mail / WhatsApp.");
    router.push("/compte");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">Nouveau rendez-vous</h2>
      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Service</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Jour</label>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Créneaux disponibles</label>
          <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
            {slotsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 w-full animate-pulse rounded-xl bg-white/5" />
              ))
            ) : slots.length === 0 ? (
              <p className="text-sm text-white/45">Aucun créneau ce jour-là.</p>
            ) : (
              slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  disabled={!s.available}
                  onClick={() => setSlot(s.time)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    !s.available
                      ? "border-transparent bg-white/5 text-white/20 cursor-not-allowed"
                      : slot === s.time
                        ? "border-[#c9a227] bg-[#c9a227]/15 text-[#f6e7b8]"
                        : "border-white/10 bg-black/30 text-white/80 hover:border-white/25"
                  }`}
                >
                  {formatTimeShort(s.time)}
                </button>
              ))
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="w-full rounded-full bg-[#c9a227] py-3 text-sm font-semibold text-black transition hover:bg-[#e4c04a] disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Confirmer la réservation"}
        </button>
        {msg && <p className="text-sm text-white/75">{msg}</p>}
      </div>
    </div>
  );
}
