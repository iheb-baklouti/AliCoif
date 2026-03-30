"use client";

import { useSalonSocket } from "@/hooks/useSalonSocket";

export function SalonSeats() {
  const { snapshot, connected } = useSalonSocket();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Disponibilité des Postes</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            connected ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {connected ? "Temps réel" : "Synchronisation…"}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(snapshot?.seats ?? Array.from({ length: 5 }, (_, i) => ({
          seatNumber: i + 1,
          status: "available" as const,
          clientName: null,
          remainingMinutes: null,
          reservationId: null,
        }))).map((s) => (
          <div
            key={s.seatNumber}
            className={`rounded-xl border px-3 py-4 transition ${
              s.status === "occupied"
                ? "border-[#c9a227]/40 bg-[#c9a227]/5"
                : "border-white/10 bg-black/40"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-white/50">Siège {s.seatNumber}</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {s.status === "occupied" ? s.clientName : "Poste Libre"}
            </p>
            {s.status === "occupied" && s.remainingMinutes != null && (
              <p className="mt-1 text-xs text-[#c9a227]">≈ {s.remainingMinutes} min restantes</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
