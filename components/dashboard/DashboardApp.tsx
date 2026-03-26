"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDateTimeFr } from "@/lib/format";
import { useSalonSocket } from "@/hooks/useSalonSocket";
import { AdminMediaPanel } from "@/components/admin/AdminMediaPanel";
import { StaffModal, type StaffModalMode, type StaffFormData } from "@/components/dashboard/StaffModal";
import { showToast } from "@/components/dashboard/Toast";
import { DashboardCompte } from "@/components/dashboard/DashboardCompte";
import { ClientHistoryPanel } from "@/components/dashboard/ClientHistoryPanel";

/* ─── Types ─── */
type Reservation = {
  id: string; status: string; scheduledAt: string; seatNumber: number | null;
  startedAt: string | null;
  user: { name: string; email: string };
  service: { name: string; durationMinutes: number; priceCents: number };
};
type Stats = {
  clients: { day: number; week: number; month: number; total: number };
  revenue: { monthCents: number; avgCents: number };
  topServices: { service?: { name: string }; count: number }[];
  pending: number; cancelledMonth: number;
  dailyChart: { date: string; count: number }[];
};
type TeamRow = { id: string; name: string; email: string; seatNumber: number | null; completedThisMonth: number; completedTotal: number };
type StaffMember = { id: string; name: string; email: string; phone: string | null; seatNumber: number | null };
type Client = { id: string; name: string; email: string; phone: string | null };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente", CONFIRMED: "Confirmée", REJECTED: "Refusée",
  IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée",
};

function KpiCard({ label, value, sub, gold }: { label: string; value: string | number; sub?: string; gold?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${gold ? "text-[#c9a227]" : "text-white"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-white/30">{sub}</p>}
    </div>
  );
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-14">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-[#c9a227]/60 transition-all hover:bg-[#c9a227]"
            style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
            title={`${d.date}: ${d.count}`}
          />
          <span className="text-[9px] text-white/25">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardApp() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "dash";
  const { snapshot } = useSalonSocket();

  const [role, setRole] = useState<"ADMIN" | "STAFF" | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; priceCents: number; durationMinutes: number; active: boolean }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<{ id: string; authorName: string; text: string; rating: number; published: boolean }[]>([]);
  const [businessHours, setBusinessHours] = useState({ open: "09:00", close: "19:00", slotMinutes: 30 });
  const [settingsContact, setSettingsContact] = useState({ phone: "", whatsapp: "", salonAddress: "", adminEmail: "" });
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffModal, setStaffModal] = useState<{ mode: StaffModalMode; member?: StaffMember } | null>(null);
  const [staffDash, setStaffDash] = useState<{
    seat: number; waitingConfirmedToday: number; pendingApprovals: number; completedThisMonth: number;
    queueToday: Reservation[]; activeOnMySeat: Reservation | null;
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  // Reviews form
  const [newReview, setNewReview] = useState({ authorName: "", text: "", rating: 5 });

  /* ─── Loaders ─── */
  const loadMe = useCallback(async () => {
    const r = await fetch("/api/auth/me");
    const j = await r.json();
    if (!j.user || (j.user.role !== "ADMIN" && j.user.role !== "STAFF")) {
      router.replace("/connexion?next=/dashboard"); return;
    }
    setRole(j.user.role);
    if (j.user.role === "STAFF" && !sp.get("tab")) router.replace("/dashboard?tab=staff");
  }, [router, sp]);

  const loadRes = useCallback(async () => {
    const j = await fetch("/api/admin/reservations").then((r) => r.json());
    setReservations(j.reservations ?? []);
  }, []);

  const loadStats = useCallback(async () => {
    const j = await fetch("/api/admin/stats").then((r) => r.json());
    setStats(j);
  }, []);

  const loadClients = useCallback(async () => {
    const j = await fetch(`/api/admin/clients?q=${encodeURIComponent(clientQuery)}`).then((r) => r.json());
    setClients(j.clients ?? []);
  }, [clientQuery]);

  const loadServices = useCallback(async () => {
    const j = await fetch("/api/services").then((r) => r.json());
    setServices(j.services ?? []);
  }, []);

  const loadSettings = useCallback(async () => {
    const j = await fetch("/api/admin/settings").then((r) => r.json());
    if (j.businessHours) setBusinessHours({ open: j.businessHours.open ?? "09:00", close: j.businessHours.close ?? "19:00", slotMinutes: j.businessHours.slotMinutes ?? 30 });
    setSettingsContact({ phone: j.phone ?? "", whatsapp: j.whatsapp ?? "", salonAddress: j.salonAddress ?? "", adminEmail: j.adminEmail ?? "" });
  }, []);

  const loadReviews = useCallback(async () => {
    const j = await fetch("/api/admin/reviews").then((r) => r.json());
    setReviews(j.reviews ?? []);
  }, []);

  const loadTeam = useCallback(async () => {
    const j = await fetch("/api/admin/team-stats").then((r) => r.json());
    setTeam(j.team ?? []);
  }, []);

  const loadStaff = useCallback(async () => {
    const r = await fetch("/api/staff/dashboard");
    if (!r.ok) return;
    setStaffDash(await r.json());
  }, []);

  const loadStaffMembers = useCallback(async () => {
    const j = await fetch("/api/admin/staff").then((r) => r.json());
    setStaffMembers(j.staff ?? []);
  }, []);

  /* ─── Effects ─── */
  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => {
    if (!role) return;
    if (role === "STAFF") { loadStaff(); return; }
    loadRes(); loadStats(); loadServices(); loadSettings(); loadReviews();
  }, [role, loadRes, loadStats, loadServices, loadSettings, loadReviews, loadStaff]);
  useEffect(() => { if (role === "STAFF" && tab === "staff") loadStaff(); }, [role, tab, loadStaff]);
  useEffect(() => { if (role === "ADMIN" && tab === "clients") loadClients(); }, [role, tab, loadClients]);
  useEffect(() => { if (role === "ADMIN" && tab === "equipe") loadTeam(); }, [role, tab, loadTeam]);
  useEffect(() => { if (role === "ADMIN" && tab === "staff") loadStaffMembers(); }, [role, tab, loadStaffMembers]);

  /* ─── Actions ─── */
  async function patchReservation(id: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (r.ok) showToast("success", "Réservation mise à jour ✓");
    else showToast("error", "Erreur lors de la mise à jour.");
    loadRes(); loadStats(); loadTeam();
  }

  async function staffAction(id: string, action: "start" | "complete") {
    await fetch(`/api/staff/reservations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    loadStaff(); loadRes();
  }

  async function saveService(id: string, data: { priceCents?: number; durationMinutes?: number; active?: boolean }) {
    await fetch(`/api/admin/services/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    loadServices();
  }

  async function saveSettings() {
    setSavingSettings(true);
    const r = await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessHours, ...settingsContact }),
    });
    setSavingSettings(false);
    if (r.ok) { showToast("success", "Paramètres enregistrés ✓"); loadSettings(); }
    else showToast("error", "Erreur lors de l'enregistrement.");
  }

  /* ─── Staff CRUD ─── */
  async function handleStaffConfirm(form: StaffFormData) {
    if (!staffModal) return;
    if (staffModal.mode === "add") {
      const r = await fetch("/api/admin/staff", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { showToast("error", j.error || "Erreur de création."); throw new Error(); }
      showToast("success", `${form.name} ajouté ✓`);
    } else if (staffModal.mode === "edit" && staffModal.member) {
      const body: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone, seatNumber: form.seatNumber };
      if (form.password) body.password = form.password;
      const r = await fetch(`/api/admin/staff/${staffModal.member.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { showToast("error", j.error || "Erreur de mise à jour."); throw new Error(); }
      showToast("success", "Membre mis à jour ✓");
    } else if (staffModal.mode === "delete" && staffModal.member) {
      const r = await fetch(`/api/admin/staff/${staffModal.member.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { showToast("error", j.error || "Suppression impossible."); throw new Error(); }
      showToast("success", "Membre supprimé ✓");
    }
    loadStaffMembers(); loadTeam();
  }

  /* ─── Reviews CRUD ─── */
  async function createReview(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/reviews", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newReview),
    });
    if (r.ok) {
      showToast("success", "Avis ajouté ✓");
      setNewReview({ authorName: "", text: "", rating: 5 });
      loadReviews();
    } else showToast("error", "Erreur lors de la création.");
  }

  async function toggleReview(id: string, published: boolean) {
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published }),
    });
    loadReviews();
  }

  async function deleteReview(id: string) {
    const r = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    if (r.ok) { showToast("success", "Avis supprimé ✓"); loadReviews(); }
    else showToast("error", "Erreur lors de la suppression.");
  }

  /* ─── Loading state ─── */
  if (!role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#c9a227] border-t-transparent" />
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  /* ─── STAFF view ─── */
  if (role === "STAFF" && tab === "staff") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-white">Mon poste</h1>
        {staffDash && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Siège" value={staffDash.seat} gold />
            <KpiCard label="RDV confirmés aujourd'hui" value={staffDash.waitingConfirmedToday} />
            <KpiCard label="Demandes en attente" value={staffDash.pendingApprovals} />
            <KpiCard label="Terminés ce mois" value={staffDash.completedThisMonth} />
          </div>
        )}
        {staffDash?.activeOnMySeat && (
          <div className="mt-8 rounded-2xl border border-[#c9a227]/30 bg-[#c9a227]/10 p-6">
            <p className="text-sm font-semibold text-[#f0e6b8]">Client en cours sur votre siège</p>
            <p className="mt-2 text-white">{staffDash.activeOnMySeat.user.name}</p>
            <p className="text-sm text-white/65">{staffDash.activeOnMySeat.service.name}</p>
            <button type="button" onClick={() => staffAction(staffDash.activeOnMySeat!.id, "complete")}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 active:scale-95 transition-all cursor-pointer">
              Marquer terminé
            </button>
          </div>
        )}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white">File du jour (confirmés)</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {(staffDash?.queueToday ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <span>{r.user.name} — {r.service.name} — {formatDateTimeFr(r.scheduledAt)}</span>
                {r.status === "CONFIRMED" && (
                  <button type="button" onClick={() => staffAction(r.id, "start")}
                    className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/40 active:scale-95 transition-all cursor-pointer">
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

  if (role === "STAFF" && tab === "compte") return <DashboardCompte />;

  /* ─── ADMIN tabs ─── */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Page header */}
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[#c9a227]">Administration</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-white">L&apos;Artiste</h1>
        <p className="mt-2 text-sm text-white/55">Kairouan, Tunisie — Gestion du salon.</p>
      </div>

      {/* ── DASH TAB ── */}
      {tab === "dash" && (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Terminés aujourd'hui" value={stats?.clients.day ?? "—"} />
            <KpiCard label="Terminés cette semaine" value={stats?.clients.week ?? "—"} />
            <KpiCard label="Terminés ce mois" value={stats?.clients.month ?? "—"} />
            <KpiCard label="CA du mois" value={stats ? `${(stats.revenue.monthCents / 100).toFixed(0)} TND` : "—"} gold />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="En attente de validation" value={stats?.pending ?? "—"} sub="réservations à traiter" />
            <KpiCard label="Annulées ce mois" value={stats?.cancelledMonth ?? "—"} />
            <KpiCard label="Clients inscrits total" value={stats?.clients.total ?? "—"} />
          </div>

          {stats?.dailyChart && stats.dailyChart.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Réservations terminées — 7 derniers jours</h2>
              <MiniBarChart data={stats.dailyChart} />
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Sièges en direct</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(snapshot?.seats ?? []).map((s) => (
                <div key={s.seatNumber} className={`rounded-xl border p-4 ${s.status === "occupied" ? "border-[#c9a227]/30 bg-[#c9a227]/5" : "border-white/10 bg-black/40"}`}>
                  <p className="text-xs text-white/45">Siège {s.seatNumber}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{s.status === "occupied" ? s.clientName : "Disponible"}</p>
                  {s.remainingMinutes != null && <p className="mt-1 text-xs text-[#c9a227]">~ {s.remainingMinutes} min</p>}
                </div>
              ))}
              {(!snapshot?.seats || snapshot.seats.length === 0) && (
                <p className="text-sm text-white/30 col-span-5">Données en cours de chargement…</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">Top services (30 j.)</h2>
            <ul className="mt-4 space-y-2">
              {(stats?.topServices ?? []).map((t, i) => (
                <li key={i} className="flex items-center justify-between text-sm text-white/75">
                  <span>{t.service?.name ?? "—"}</span>
                  <span className="text-[#c9a227] font-semibold">{t.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── RES TAB ── */}
      {tab === "res" && (
        <div className="mt-8 overflow-x-auto">
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
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{r.user.name}</div>
                    <div className="text-xs text-white/45">{r.user.email}</div>
                  </td>
                  <td className="py-3 pr-4">{r.service.name}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDateTimeFr(r.scheduledAt)}</td>
                  <td className="py-3 pr-4">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="py-3 pr-4">{r.seatNumber ?? "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1.5">
                      {r.status === "PENDING" && (
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => patchReservation(r.id, { action: "approve" })}
                            className="rounded-full bg-emerald-500/25 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/40 cursor-pointer active:scale-95 transition-all">Accepter</button>
                          <button type="button" onClick={() => patchReservation(r.id, { action: "reject" })}
                            className="rounded-full bg-red-500/20 px-2 py-1 text-[11px] text-red-200 hover:bg-red-500/30 cursor-pointer active:scale-95 transition-all">Refuser</button>
                        </div>
                      )}
                      {r.status === "CONFIRMED" && (
                        <div className="flex flex-wrap gap-1">
                          {[1,2,3,4,5].map((n) => (
                            <button key={n} type="button" onClick={() => patchReservation(r.id, { status: "IN_PROGRESS", seatNumber: n })}
                              className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/35 cursor-pointer active:scale-95 transition-all">S{n}</button>
                          ))}
                        </div>
                      )}
                      {r.status === "IN_PROGRESS" && (
                        <button type="button" onClick={() => patchReservation(r.id, { status: "COMPLETED" })}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20 cursor-pointer active:scale-95 transition-all">Terminer</button>
                      )}
                      {!["CANCELLED","COMPLETED","REJECTED"].includes(r.status) && (
                        <button type="button" onClick={() => patchReservation(r.id, { status: "CANCELLED" })}
                          className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-200 hover:bg-red-500/25 cursor-pointer active:scale-95 transition-all">Annuler</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── EQUIPE TAB ── */}
      {tab === "equipe" && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">Performances par coiffeur</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {team.map((t) => (
              <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c9a227]/15 text-sm font-bold text-[#c9a227]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/45">Siège {t.seatNumber ?? "—"}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-6 text-sm">
                  <div><p className="text-xs text-white/40">Ce mois</p><p className="text-[#c9a227] font-semibold">{t.completedThisMonth}</p></div>
                  <div><p className="text-xs text-white/40">Total</p><p className="text-white font-semibold">{t.completedTotal}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STAFF TAB ── */}
      {tab === "staff" && (
        <div className="mt-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Membres staff</h2>
            <button type="button"
              onClick={() => setStaffModal({ mode: "add" })}
              className="flex items-center gap-2 rounded-full bg-[#c9a227] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter
            </button>
          </div>
          <div className="space-y-3">
            {staffMembers.map((m) => (
              <div key={m.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c9a227]/15 text-sm font-bold text-[#c9a227]">{m.name.charAt(0)}</div>
                  <div>
                    <p className="font-semibold text-white">{m.name}</p>
                    <p className="text-sm text-white/55">{m.email}{m.phone ? ` • ${m.phone}` : ""} • Siège {m.seatNumber ?? "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStaffModal({ mode: "edit", member: m })}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/85 hover:bg-white/5 active:scale-95 transition-all cursor-pointer">Modifier</button>
                  <button type="button" onClick={() => setStaffModal({ mode: "delete", member: m })}
                    className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer">Supprimer</button>
                </div>
              </div>
            ))}
            {staffMembers.length === 0 && <p className="text-sm text-white/40">Aucun membre staff.</p>}
          </div>
        </div>
      )}

      {/* ── CLIENTS TAB ── */}
      {tab === "clients" && (
        <div className="mt-8 space-y-4">
          <input value={clientQuery} onChange={(e) => setClientQuery(e.target.value)}
            placeholder="Rechercher (nom, e-mail, téléphone)"
            className="w-full max-w-md rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
          <div className="grid gap-3 md:grid-cols-2">
            {clients.map((c) => (
              <div key={c.id} className="space-y-0">
                <button type="button" onClick={() => setSelectedClientId(selectedClientId === c.id ? null : c.id)}
                  className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#c9a227]/30 hover:bg-white/[0.06] transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-sm text-white/55">{c.email}</p>
                      {c.phone && <p className="text-xs text-white/40">{c.phone}</p>}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`shrink-0 text-white/30 transition-transform ${selectedClientId === c.id ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>
                {selectedClientId === c.id && (
                  <ClientHistoryPanel clientId={c.id} onClose={() => setSelectedClientId(null)} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SERVICES TAB ── */}
      {tab === "services" && (
        <div className="mt-8 space-y-4">
          {services.map((s) => (
            <div key={s.id} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <p className="font-semibold text-white">{s.name}</p>
                <p className="text-xs text-white/40">ID: {s.id}</p>
              </div>
              <label className="text-xs text-white/55">Prix (centimes)
                <input type="number" defaultValue={s.priceCents}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                  onBlur={(e) => saveService(s.id, { priceCents: Number(e.target.value) })} />
              </label>
              <label className="text-xs text-white/55">Durée (min)
                <input type="number" defaultValue={s.durationMinutes}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                  onBlur={(e) => saveService(s.id, { durationMinutes: Number(e.target.value) })} />
              </label>
              <label className="flex items-center gap-2 text-xs text-white/55 cursor-pointer">
                <input type="checkbox" defaultChecked={s.active} onChange={(e) => saveService(s.id, { active: e.target.checked })} className="cursor-pointer" />
                Actif
              </label>
            </div>
          ))}
        </div>
      )}

      {/* ── REVIEWS TAB ── */}
      {tab === "reviews" && (
        <div className="mt-8 space-y-8">
          {/* Add review form */}
          <form onSubmit={createReview} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Ajouter un avis</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required value={newReview.authorName} onChange={(e) => setNewReview((s) => ({ ...s, authorName: e.target.value }))}
                placeholder="Nom de l'auteur"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              <select value={newReview.rating} onChange={(e) => setNewReview((s) => ({ ...s, rating: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white cursor-pointer">
                {[5,4,3,2,1].map((n) => <option key={n} value={n} className="bg-black">{"★".repeat(n)} {n}/5</option>)}
              </select>
            </div>
            <textarea required value={newReview.text} onChange={(e) => setNewReview((s) => ({ ...s, text: e.target.value }))}
              placeholder="Texte de l'avis…" rows={3}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
            <button type="submit"
              className="rounded-full bg-[#c9a227] px-5 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer">
              Ajouter l&apos;avis
            </button>
          </form>

          {/* List */}
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{r.authorName}</p>
                      <span className="text-xs text-[#c9a227]">{"★".repeat(r.rating)}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${r.published ? "border-emerald-500/30 text-emerald-300" : "border-white/10 text-white/40"}`}>
                        {r.published ? "Publié" : "Masqué"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/70">{r.text}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => toggleReview(r.id, !r.published)}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/5 active:scale-95 transition-all cursor-pointer">
                      {r.published ? "Masquer" : "Publier"}
                    </button>
                    <button type="button" onClick={() => deleteReview(r.id)}
                      className="rounded-full border border-red-400/20 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer">
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div className="mt-8 max-w-2xl space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Horaires &amp; créneaux</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Ouverture</label>
                <input value={businessHours.open} onChange={(e) => setBusinessHours((h) => ({ ...h, open: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Fermeture</label>
                <input value={businessHours.close} onChange={(e) => setBusinessHours((h) => ({ ...h, close: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Créneau (min)</label>
                <input type="number" min={10} max={120} value={businessHours.slotMinutes}
                  onChange={(e) => setBusinessHours((h) => ({ ...h, slotMinutes: Number(e.target.value) || 30 }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Contact &amp; adresse</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Téléphone affiché</label>
                <input value={settingsContact.phone} onChange={(e) => setSettingsContact((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="+216 XX XXX XXX"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50">Numéro WhatsApp</label>
                <input value={settingsContact.whatsapp} onChange={(e) => setSettingsContact((s) => ({ ...s, whatsapp: e.target.value }))}
                  placeholder="+21620392769"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-white/50">Adresse du salon</label>
                <input value={settingsContact.salonAddress} onChange={(e) => setSettingsContact((s) => ({ ...s, salonAddress: e.target.value }))}
                  placeholder="Rue Ibn Khaldoun, Kairouan, Tunisie"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-white/50">E-mail de notification admin</label>
                <input type="email" value={settingsContact.adminEmail} onChange={(e) => setSettingsContact((s) => ({ ...s, adminEmail: e.target.value }))}
                  placeholder="admin@salon.tn"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
            </div>
          </div>

          <button type="button" onClick={saveSettings} disabled={savingSettings}
            className="rounded-full bg-[#c9a227] px-6 py-3 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer disabled:opacity-60">
            {savingSettings ? "Enregistrement…" : "Enregistrer tous les paramètres"}
          </button>
        </div>
      )}

      {/* ── MEDIA TAB ── */}
      {tab === "media" && <AdminMediaPanel />}

      {/* ── COMPTE TAB ── */}
      {tab === "compte" && <DashboardCompte />}

      {/* ── Staff Modal ── */}
      {staffModal && (
        <StaffModal
          mode={staffModal.mode}
          initial={staffModal.member ? {
            id: staffModal.member.id,
            name: staffModal.member.name,
            email: staffModal.member.email,
            phone: staffModal.member.phone ?? "",
            seatNumber: staffModal.member.seatNumber ?? 1,
          } : undefined}
          targetName={staffModal.member?.name}
          onConfirm={handleStaffConfirm}
          onClose={() => setStaffModal(null)}
        />
      )}
    </div>
  );
}
