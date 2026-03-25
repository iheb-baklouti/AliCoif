"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDateTimeFr } from "@/lib/format";
import { useSalonSocket } from "@/hooks/useSalonSocket";
import { AdminMediaPanel } from "@/components/admin/AdminMediaPanel";

type Reservation = {
  id: string;
  status: string;
  scheduledAt: string;
  seatNumber: number | null;
  startedAt: string | null;
  user: { name: string; email: string };
  service: { name: string; durationMinutes: number; priceCents: number };
};

type Stats = {
  clients: { day: number; week: number; month: number };
  revenue: { monthCents: number };
  topServices: { service?: { name: string }; count: number }[];
};

type TeamRow = {
  id: string;
  name: string;
  email: string;
  seatNumber: number | null;
  completedThisMonth: number;
  completedTotal: number;
};

type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  seatNumber: number | null;
};

function adminStatusLabel(s: string) {
  const m: Record<string, string> = {
    PENDING: "En attente",
    CONFIRMED: "Confirmée",
    REJECTED: "Refusée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  };
  return m[s] ?? s;
}

export function DashboardApp() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "dash";
  const { snapshot } = useSalonSocket();

  const [role, setRole] = useState<"ADMIN" | "STAFF" | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; email: string; phone: string | null }[]>([]);
  const [services, setServices] = useState<
    { id: string; name: string; priceCents: number; durationMinutes: number; active: boolean }[]
  >([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<{ id: string; authorName: string; text: string; published: boolean }[]>([]);
  const [businessHours, setBusinessHours] = useState({
    open: "09:00",
    close: "19:00",
    slotMinutes: 30,
  });
  const [clientQuery, setClientQuery] = useState("");
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    seatNumber: 1,
  });
  const [staffDash, setStaffDash] = useState<{
    seat: number;
    waitingConfirmedToday: number;
    pendingApprovals: number;
    completedThisMonth: number;
    queueToday: Reservation[];
    activeOnMySeat: Reservation | null;
  } | null>(null);

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/auth/me");
    const j = await r.json();
    if (!j.user || (j.user.role !== "ADMIN" && j.user.role !== "STAFF")) {
      router.replace("/connexion?next=/dashboard");
      return;
    }
    setRole(j.user.role);
    if (j.user.role === "STAFF" && !sp.get("tab")) {
      router.replace("/dashboard?tab=staff");
    }
  }, [router, sp]);

  const loadRes = useCallback(async () => {
    const r = await fetch("/api/admin/reservations");
    const j = await r.json();
    setReservations(j.reservations ?? []);
  }, []);

  const loadStats = useCallback(async () => {
    const r = await fetch("/api/admin/stats");
    const j = await r.json();
    setStats(j);
  }, []);

  const loadClients = useCallback(async () => {
    const r = await fetch(`/api/admin/clients?q=${encodeURIComponent(clientQuery)}`);
    const j = await r.json();
    setClients(j.clients ?? []);
  }, [clientQuery]);

  const loadServices = useCallback(async () => {
    const r = await fetch("/api/services");
    const j = await r.json();
    setServices(j.services ?? []);
  }, []);

  const loadSettings = useCallback(async () => {
    const r = await fetch("/api/admin/settings");
    const j = await r.json();
    if (j.businessHours) {
      setBusinessHours({
        open: j.businessHours.open ?? "09:00",
        close: j.businessHours.close ?? "19:00",
        slotMinutes: j.businessHours.slotMinutes ?? 30,
      });
    }
  }, []);

  const loadReviews = useCallback(async () => {
    const r = await fetch("/api/admin/reviews");
    const j = await r.json();
    setReviews(j.reviews ?? []);
  }, []);

  const loadTeam = useCallback(async () => {
    const r = await fetch("/api/admin/team-stats");
    const j = await r.json();
    setTeam(j.team ?? []);
  }, []);

  const loadStaff = useCallback(async () => {
    const r = await fetch("/api/staff/dashboard");
    if (!r.ok) return;
    const j = await r.json();
    setStaffDash(j);
  }, []);

  const loadStaffMembers = useCallback(async () => {
    const r = await fetch("/api/admin/staff");
    const j = await r.json();
    setStaffMembers(j.staff ?? []);
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!role) return;
    if (role === "STAFF") {
      loadStaff();
      return;
    }
    loadRes();
    loadStats();
    loadServices();
    loadSettings();
    loadReviews();
  }, [role, loadRes, loadStats, loadServices, loadSettings, loadReviews]);

  useEffect(() => {
    if (role === "STAFF" && tab === "staff") {
      loadStaff();
    }
  }, [role, tab, loadStaff]);

  useEffect(() => {
    if (role === "ADMIN" && tab === "clients") loadClients();
  }, [role, tab, loadClients]);

  useEffect(() => {
    if (role === "ADMIN" && tab === "equipe") loadTeam();
  }, [role, tab, loadTeam]);

  useEffect(() => {
    if (role === "ADMIN" && tab === "staff") loadStaffMembers();
  }, [role, tab, loadStaffMembers]);

  async function patchReservation(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    loadRes();
    loadStats();
    loadTeam();
  }

  async function staffAction(id: string, action: "start" | "complete") {
    await fetch(`/api/staff/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadStaff();
    loadRes();
  }

  async function saveService(id: string, data: { priceCents?: number; durationMinutes?: number; active?: boolean }) {
    await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadServices();
  }

  async function saveSettings() {
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessHours }),
    });
    if (!r.ok) {
      alert("Erreur lors de l’enregistrement.");
      return;
    }
    alert("Paramètres enregistrés.");
    loadSettings();
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffForm),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.error || "Erreur lors de la création.");
      return;
    }
    setStaffForm({ name: "", email: "", phone: "", password: "", seatNumber: 1 });
    loadStaffMembers();
  }

  async function updateStaff(member: StaffMember) {
    const name = prompt("Nom", member.name);
    if (name == null) return;
    const email = prompt("E-mail", member.email);
    if (email == null) return;
    const seatRaw = prompt("Siège (1 à 5)", String(member.seatNumber ?? 1));
    if (seatRaw == null) return;
    const seatNumber = Number(seatRaw);
    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 5) {
      alert("Siège invalide.");
      return;
    }
    const phone = prompt("Téléphone (optionnel)", member.phone ?? "") ?? "";
    const newPassword = prompt("Nouveau mot de passe (laisser vide pour ne pas changer)", "") ?? "";

    const r = await fetch(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        seatNumber,
        password: newPassword || undefined,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.error || "Erreur lors de la mise à jour.");
      return;
    }
    loadStaffMembers();
    loadTeam();
  }

  async function removeStaff(member: StaffMember) {
    if (!confirm(`Supprimer ${member.name} ?`)) return;
    const r = await fetch(`/api/admin/staff/${member.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.error || "Suppression impossible.");
      return;
    }
    loadStaffMembers();
    loadTeam();
  }

  if (!role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/50">
        Chargement du tableau de bord…
      </div>
    );
  }

  if (role === "STAFF") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-white">Mon poste</h1>
        {staffDash && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-white/45">Siège</p>
              <p className="mt-1 text-2xl font-semibold text-[#c9a227]">{staffDash.seat}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-white/45">RDV confirmés aujourd&apos;hui (file)</p>
              <p className="mt-1 text-2xl font-semibold text-white">{staffDash.waitingConfirmedToday}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-white/45">Demandes en attente (salon)</p>
              <p className="mt-1 text-2xl font-semibold text-amber-200">{staffDash.pendingApprovals}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-white/45">Clients terminés (mois)</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-200">{staffDash.completedThisMonth}</p>
            </div>
          </div>
        )}
        {staffDash?.activeOnMySeat && (
          <div className="mt-8 rounded-2xl border border-[#c9a227]/30 bg-[#c9a227]/10 p-6">
            <p className="text-sm font-semibold text-[#f0e6b8]">Client en cours sur votre siège</p>
            <p className="mt-2 text-white">{staffDash.activeOnMySeat.user.name}</p>
            <p className="text-sm text-white/65">{staffDash.activeOnMySeat.service.name}</p>
            <button
              type="button"
              onClick={() => staffAction(staffDash.activeOnMySeat!.id, "complete")}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90"
            >
              Marquer terminé
            </button>
          </div>
        )}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white">File du jour (confirmés)</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {(staffDash?.queueToday ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <span>
                  {r.user.name} — {r.service.name} — {formatDateTimeFr(r.scheduledAt)}
                </span>
                {r.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() => staffAction(r.id, "start")}
                    className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100"
                  >
                    Démarrer sur mon siège
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[#c9a227]">Administration</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-white">L&apos;Artiste</h1>
        <p className="mt-2 text-sm text-white/55">Validation des réservations, sièges et équipe.</p>
      </div>

      {tab === "dash" && (
        <div className="mt-10 space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-wider text-white/45">Clients terminés (jour)</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats?.clients.day ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-wider text-white/45">Clients terminés (semaine)</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats?.clients.week ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-wider text-white/45">CA (30 j.)</p>
              <p className="mt-2 text-3xl font-semibold text-[#c9a227]">
                {stats ? `${(stats.revenue.monthCents / 100).toFixed(2)} TND` : "—"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Sièges en direct</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(snapshot?.seats ?? []).map((s) => (
                <div key={s.seatNumber} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs text-white/45">Siège {s.seatNumber}</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {s.status === "occupied" ? s.clientName : "Disponible"}
                  </p>
                  {s.remainingMinutes != null && (
                    <p className="mt-1 text-xs text-[#c9a227]">~ {s.remainingMinutes} min</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Services les plus demandés (30 j.)</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              {(stats?.topServices ?? []).map((t, i) => (
                <li key={i}>
                  {t.service?.name ?? "—"} — {t.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "res" && (
        <div className="mt-10 space-y-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Service</th>
                <th className="py-3 pr-4">Créneau</th>
                <th className="py-3 pr-4">Statut</th>
                <th className="py-3 pr-4">Siège</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-white/85">
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{r.user.name}</div>
                    <div className="text-xs text-white/45">{r.user.email}</div>
                  </td>
                  <td className="py-3 pr-4">{r.service.name}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDateTimeFr(r.scheduledAt)}</td>
                  <td className="py-3 pr-4">{adminStatusLabel(r.status)}</td>
                  <td className="py-3 pr-4">{r.seatNumber ?? "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      {r.status === "PENDING" && (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded-full bg-emerald-500/25 px-2 py-1 text-[11px] text-emerald-100"
                            onClick={() => patchReservation(r.id, { action: "approve" })}
                          >
                            Accepter
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-red-500/20 px-2 py-1 text-[11px] text-red-200"
                            onClick={() => {
                              const note = prompt("Motif (optionnel) ?") ?? "";
                              patchReservation(r.id, { action: "reject", adminNote: note || undefined });
                            }}
                          >
                            Refuser
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-amber-500/20 px-2 py-1 text-[11px] text-amber-100"
                            onClick={() => {
                              const iso = prompt("Nouvelle date/heure (ISO), ex. 2026-03-22T10:00:00.000Z");
                              if (!iso) return;
                              patchReservation(r.id, { action: "reschedule", scheduledAt: iso });
                            }}
                          >
                            Autre date
                          </button>
                        </div>
                      )}
                      {r.status === "CONFIRMED" && (
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-100"
                              onClick={() =>
                                patchReservation(r.id, { status: "IN_PROGRESS", seatNumber: n })
                              }
                            >
                              S{n}
                            </button>
                          ))}
                        </div>
                      )}
                      {r.status === "IN_PROGRESS" && (
                        <button
                          type="button"
                          className="rounded-full bg-white/10 px-3 py-1 text-xs"
                          onClick={() => patchReservation(r.id, { status: "COMPLETED" })}
                        >
                          Terminer
                        </button>
                      )}
                      {r.status !== "CANCELLED" && r.status !== "COMPLETED" && r.status !== "REJECTED" && (
                        <button
                          type="button"
                          className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-200"
                          onClick={() => patchReservation(r.id, { status: "CANCELLED" })}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "equipe" && (
        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-white">Performances par coiffeur</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {team.map((t) => (
              <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-semibold text-white">{t.name}</p>
                <p className="text-xs text-white/45">Siège {t.seatNumber ?? "—"}</p>
                <p className="mt-2 text-sm text-white/70">
                  Terminés ce mois : <span className="text-[#c9a227]">{t.completedThisMonth}</span> — Total :{" "}
                  {t.completedTotal}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "staff" && (
        <div className="mt-10 space-y-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Ajouter un membre staff</h2>
            <form onSubmit={createStaff} className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                required
                value={staffForm.name}
                onChange={(e) => setStaffForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Nom complet"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white"
              />
              <input
                required
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="E-mail"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white"
              />
              <input
                value={staffForm.phone}
                onChange={(e) => setStaffForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="Téléphone (optionnel)"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white"
              />
              <input
                required
                type="password"
                minLength={6}
                value={staffForm.password}
                onChange={(e) => setStaffForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="Mot de passe"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white"
              />
              <select
                value={staffForm.seatNumber}
                onChange={(e) => setStaffForm((s) => ({ ...s, seatNumber: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Siège {n}
                  </option>
                ))}
              </select>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#c9a227] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#e4c04a]"
                >
                  Ajouter staff
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Membres staff</h2>
            {staffMembers.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-white">{m.name}</p>
                  <p className="text-sm text-white/60">
                    {m.email} {m.phone ? `• ${m.phone}` : ""} • Siège {m.seatNumber ?? "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateStaff(m)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/85"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStaff(m)}
                    className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
            {staffMembers.length === 0 && <p className="text-sm text-white/55">Aucun staff pour le moment.</p>}
          </div>
        </div>
      )}

      {tab === "clients" && (
        <div className="mt-10 space-y-4">
          <input
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            placeholder="Rechercher (nom, e-mail, téléphone)"
            className="w-full max-w-md rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {clients.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-semibold text-white">{c.name}</p>
                <p className="text-sm text-white/55">{c.email}</p>
                {c.phone && <p className="text-sm text-white/45">{c.phone}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "services" && (
        <div className="mt-10 space-y-4">
          {services.map((s) => (
            <div
              key={s.id}
              className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_auto_auto_auto]"
            >
              <div>
                <p className="font-semibold text-white">{s.name}</p>
                <p className="text-xs text-white/45">ID: {s.id}</p>
              </div>
              <label className="text-xs text-white/55">
                Prix (centimes)
                <input
                  type="number"
                  defaultValue={s.priceCents}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                  onBlur={(e) => saveService(s.id, { priceCents: Number(e.target.value) })}
                />
              </label>
              <label className="text-xs text-white/55">
                Durée (min)
                <input
                  type="number"
                  defaultValue={s.durationMinutes}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                  onBlur={(e) => saveService(s.id, { durationMinutes: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-white/55">
                <input
                  type="checkbox"
                  defaultChecked={s.active}
                  onChange={(e) => saveService(s.id, { active: e.target.checked })}
                />
                Actif
              </label>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="mt-10 max-w-2xl space-y-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Horaires &amp; créneaux</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Ouverture</label>
                <input
                  value={businessHours.open}
                  onChange={(e) => setBusinessHours((h) => ({ ...h, open: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Fermeture</label>
                <input
                  value={businessHours.close}
                  onChange={(e) => setBusinessHours((h) => ({ ...h, close: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Créneau (minutes)</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={businessHours.slotMinutes}
                  onChange={(e) =>
                    setBusinessHours((h) => ({ ...h, slotMinutes: Number(e.target.value) || 30 }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={saveSettings}
            className="rounded-full bg-[#c9a227] px-6 py-3 text-sm font-semibold text-black hover:bg-[#e4c04a]"
          >
            Enregistrer
          </button>
        </div>
      )}

      {tab === "media" && <AdminMediaPanel />}

      {tab === "reviews" && (
        <div className="mt-10 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">{r.authorName}</p>
                  <p className="text-sm text-white/70">{r.text}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-3 py-1 text-xs"
                  onClick={async () => {
                    await fetch(`/api/admin/reviews/${r.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ published: !r.published }),
                    });
                    loadReviews();
                  }}
                >
                  {r.published ? "Masquer" : "Publier"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
