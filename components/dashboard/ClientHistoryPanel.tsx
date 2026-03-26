"use client";

import { useEffect, useState } from "react";
import { formatDateTimeFr } from "@/lib/format";

type Reservation = {
  id: string;
  status: string;
  scheduledAt: string;
  seatNumber: number | null;
  service: { name: string; priceCents: number; durationMinutes: number };
};

type ClientDetail = {
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string; preferences: string | null };
  reservations: Reservation[];
  totalSpentCents: number;
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "CONFIRMED", label: "Confirmée" },
  { value: "COMPLETED", label: "Terminée" },
  { value: "CANCELLED", label: "Annulée" },
  { value: "REJECTED", label: "Refusée" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-amber-200 bg-amber-500/10 border-amber-500/20",
  CONFIRMED: "text-blue-200 bg-blue-500/10 border-blue-500/20",
  IN_PROGRESS: "text-emerald-200 bg-emerald-500/10 border-emerald-500/20",
  COMPLETED: "text-green-200 bg-green-500/10 border-green-500/20",
  CANCELLED: "text-white/40 bg-white/5 border-white/10",
  REJECTED: "text-red-300 bg-red-500/10 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  REJECTED: "Refusée",
};

interface Props {
  clientId: string;
  onClose: () => void;
}

export function ClientHistoryPanel({ clientId, onClose }: Props) {
  const [data, setData] = useState<ClientDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  function fetchData(status = statusFilter, from = fromDate, to = toDate) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/admin/clients/${clientId}?${params}`)
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => { fetchData(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters() { fetchData(); }

  const res = data?.reservations ?? [];

  return (
    <div className="mt-4 rounded-2xl border border-[#c9a227]/20 bg-[#0d0d00]/60 p-5 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{data?.user.name ?? "…"}</p>
          <p className="text-sm text-white/55">{data?.user.email}</p>
          {data?.user.phone && <p className="text-xs text-white/40">{data.user.phone}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-white/40">Total dépensé</p>
            <p className="text-lg font-semibold text-[#c9a227]">
              {data ? `${(data.totalSpentCents / 100).toFixed(2)} TND` : "…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/30 cursor-pointer"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-black">{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/30 cursor-pointer"
          placeholder="Depuis"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/30 cursor-pointer"
          placeholder="Jusqu'au"
        />
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-xl bg-[#c9a227]/20 px-4 py-2 text-sm font-medium text-[#f0e6b8] hover:bg-[#c9a227]/30 transition cursor-pointer"
        >
          Filtrer
        </button>
      </div>

      {/* Reservations list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {res.length === 0 && (
          <p className="text-sm text-white/40 py-4 text-center">Aucune réservation trouvée.</p>
        )}
        {res.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{r.service.name}</p>
              <p className="text-xs text-white/45">{formatDateTimeFr(r.scheduledAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#c9a227]">{(r.service.priceCents / 100).toFixed(2)} TND</span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status] ?? "text-white/50"}`}>
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
