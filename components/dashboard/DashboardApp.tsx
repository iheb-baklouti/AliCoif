"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDateTimeFr } from "@/lib/format";
import { useSalonSocket } from "@/hooks/useSalonSocket";
import { AdminMediaPanel } from "@/components/admin/AdminMediaPanel";
import { StaffModal, type StaffModalMode, type StaffFormData } from "@/components/dashboard/StaffModal";
import { ServiceModal, type ServiceModalMode, type ServiceFormData } from "@/components/dashboard/ServiceModal";
import { showToast } from "@/components/dashboard/Toast";
import { DashboardCompte } from "@/components/dashboard/DashboardCompte";
import { ClientHistoryPanel } from "@/components/dashboard/ClientHistoryPanel";
import { SkeletonKpiGrid, SkeletonRows, SkeletonTable } from "@/components/dashboard/Skeleton";

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
type ServiceRow = { id: string; name: string; slug: string; description: string | null; priceCents: number; durationMinutes: number; category: string | null; active: boolean };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente", CONFIRMED: "Confirmée", REJECTED: "Refusée",
  IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée",
};
const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-400", CONFIRMED: "bg-blue-400", IN_PROGRESS: "bg-emerald-400",
  COMPLETED: "bg-green-400", CANCELLED: "bg-white/20", REJECTED: "bg-red-400",
};

/* ─── Sub-components ─── */
function KpiCard({ label, value, sub, gold, icon }: { label: string; value: string | number; sub?: string; gold?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-start gap-4">
      {icon && <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">{icon}</div>}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${gold ? "text-[#c9a227]" : "text-white"}`}>{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-white/50">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t bg-[#c9a227]/60 transition-all hover:bg-[#c9a227] cursor-default"
            style={{ height: `${Math.max((d.count / max) * 100, 6)}%` }}
            title={`${d.date}: ${d.count}`} />
          <span className="text-[9px] text-white/25">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Icons (small inline SVGs) ─── */
const icons = {
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  revenue: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

export function DashboardApp() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "dash";
  const { snapshot } = useSalonSocket();

  /* State */
  const [role, setRole] = useState<"ADMIN" | "STAFF" | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resPage, setResPage] = useState(1);
  const [resStatus, setResStatus] = useState("ALL");
  const [resTotalPages, setResTotalPages] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<{ id: string; authorName: string; text: string; rating: number; published: boolean }[]>([]);
  const [businessHours, setBusinessHours] = useState({ open: "09:00", close: "19:00", slotMinutes: 30 });
  const [settingsContact, setSettingsContact] = useState({ phone: "", whatsapp: "", salonAddress: "", adminEmail: "" });
  const [clientQuery, setClientQuery] = useState("");
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsTotalPages, setClientsTotalPages] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffModal, setStaffModal] = useState<{ mode: StaffModalMode; member?: StaffMember } | null>(null);
  const [serviceModal, setServiceModal] = useState<{ mode: ServiceModalMode; service?: ServiceRow } | null>(null);
  const [staffDash, setStaffDash] = useState<{
    seat: number; waitingConfirmedToday: number; pendingApprovals: number; completedThisMonth: number;
    queueToday: Reservation[]; activeOnMySeat: Reservation | null;
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newReview, setNewReview] = useState({ authorName: "", text: "", rating: 5 });

  /* Loading states */
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRes, setLoadingRes] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

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
    setLoadingRes(true);
    const filters = new URLSearchParams();
    filters.set("page", resPage.toString());
    filters.set("limit", "15");
    if (resStatus !== "ALL") filters.set("status", resStatus);

    const j = await fetch(`/api/admin/reservations?${filters.toString()}`).then((r) => r.json());
    setReservations(j.reservations ?? []);
    setResTotalPages(j.pages || 1);
    setLoadingRes(false);
  }, [resPage, resStatus]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    const j = await fetch("/api/admin/stats").then((r) => r.json());
    setStats(j);
    setLoadingStats(false);
  }, []);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    const filters = new URLSearchParams();
    if (clientQuery) filters.set("q", clientQuery);
    filters.set("page", clientsPage.toString());
    filters.set("limit", "12");
    
    const j = await fetch(`/api/admin/clients?${filters.toString()}`).then((r) => r.json());
    setClients(j.clients ?? []);
    setClientsTotalPages(j.pages || 1);
    setLoadingClients(false);
  }, [clientQuery, clientsPage]);

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    const j = await fetch("/api/admin/services").then((r) => r.json());
    setServices(j.services ?? []);
    setLoadingServices(false);
  }, []);

  const loadSettings = useCallback(async () => {
    const j = await fetch("/api/admin/settings").then((r) => r.json());
    if (j.businessHours) setBusinessHours({ open: j.businessHours.open ?? "09:00", close: j.businessHours.close ?? "19:00", slotMinutes: j.businessHours.slotMinutes ?? 30 });
    setSettingsContact({ phone: j.phone ?? "", whatsapp: j.whatsapp ?? "", salonAddress: j.salonAddress ?? "", adminEmail: j.adminEmail ?? "" });
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    const j = await fetch("/api/admin/reviews").then((r) => r.json());
    setReviews(j.reviews ?? []);
    setLoadingReviews(false);
  }, []);

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    const j = await fetch("/api/admin/team-stats").then((r) => r.json());
    setTeam(j.team ?? []);
    setLoadingTeam(false);
  }, []);

  const loadStaffDash = useCallback(async () => {
    const r = await fetch("/api/staff/dashboard");
    if (!r.ok) return;
    setStaffDash(await r.json());
  }, []);

  const loadStaffMembers = useCallback(async () => {
    setLoadingStaff(true);
    const j = await fetch("/api/admin/staff").then((r) => r.json());
    setStaffMembers(j.staff ?? []);
    setLoadingStaff(false);
  }, []);

  /* ─── Effects ─── */
  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => {
    if (!role) return;
    if (role === "STAFF") { loadStaffDash(); return; }
    loadRes(); loadStats();
  }, [role, loadRes, loadStats, loadStaffDash]);
  useEffect(() => { if (role === "ADMIN" && tab === "services") loadServices(); }, [role, tab, loadServices]);
  useEffect(() => { if (role === "ADMIN" && tab === "settings") loadSettings(); }, [role, tab, loadSettings]);
  useEffect(() => { if (role === "ADMIN" && tab === "reviews") loadReviews(); }, [role, tab, loadReviews]);
  useEffect(() => { if (role === "ADMIN" && tab === "clients") loadClients(); }, [role, tab, loadClients]);
  useEffect(() => { if (role === "ADMIN" && tab === "equipe") loadTeam(); }, [role, tab, loadTeam]);
  useEffect(() => { if (role === "ADMIN" && tab === "staff") loadStaffMembers(); }, [role, tab, loadStaffMembers]);
  useEffect(() => { if (role === "STAFF" && tab === "staff") loadStaffDash(); }, [role, tab, loadStaffDash]);

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
    loadStaffDash(); loadRes();
  }

  async function saveSettings() {
    setSavingSettings(true);
    const r = await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessHours, ...settingsContact }),
    });
    setSavingSettings(false);
    if (r.ok) { showToast("success", "Paramètres enregistrés ✓"); } else showToast("error", "Erreur.");
  }

  /* Staff CRUD */
  async function handleStaffConfirm(form: StaffFormData) {
    if (!staffModal) return;
    const endpoint = staffModal.mode === "add" ? "/api/admin/staff" :
      `/api/admin/staff/${staffModal.member?.id}`;
    const method = staffModal.mode === "delete" ? "DELETE" :
      staffModal.mode === "add" ? "POST" : "PATCH";
    const body: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone, seatNumber: form.seatNumber };
    if (form.password) body.password = form.password;
    const r = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: method !== "DELETE" ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { showToast("error", j.error || "Erreur."); throw new Error(); }
    showToast("success", staffModal.mode === "delete" ? "Supprimé ✓" : staffModal.mode === "add" ? "Ajouté ✓" : "Mis à jour ✓");
    loadStaffMembers(); loadTeam();
  }

  /* Service CRUD */
  async function handleServiceConfirm(form: ServiceFormData) {
    if (!serviceModal) return;
    if (serviceModal.mode === "add") {
      const r = await fetch("/api/admin/services", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { showToast("error", j.error || "Erreur."); throw new Error(); }
      showToast("success", `Service « ${form.name} » ajouté ✓`);
    } else if (serviceModal.mode === "edit" && serviceModal.service) {
      const r = await fetch(`/api/admin/services/${serviceModal.service.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!r.ok) { showToast("error", "Erreur de mise à jour."); throw new Error(); }
      showToast("success", "Service mis à jour ✓");
    } else if (serviceModal.mode === "delete" && serviceModal.service) {
      const r = await fetch(`/api/admin/services/${serviceModal.service.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { showToast("error", "Erreur."); throw new Error(); }
      showToast("success", j.softDeleted ? "Service désactivé (réservations existantes) ✓" : "Service supprimé ✓");
    }
    loadServices();
  }

  /* Reviews CRUD */
  async function createReview(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/reviews", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newReview),
    });
    if (r.ok) { showToast("success", "Avis ajouté ✓"); setNewReview({ authorName: "", text: "", rating: 5 }); loadReviews(); }
    else showToast("error", "Erreur.");
  }
  async function toggleReview(id: string, published: boolean) {
    await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published }) });
    loadReviews();
  }
  async function deleteReview(id: string) {
    const r = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    if (r.ok) { showToast("success", "Avis supprimé ✓"); loadReviews(); }
  }

  /* ─── Loading ─── */
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
        {staffDash ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Siège" value={staffDash.seat} gold icon={icons.calendar} />
            <KpiCard label="Confirmés aujourd'hui" value={staffDash.waitingConfirmedToday} icon={icons.clock} />
            <KpiCard label="En attente" value={staffDash.pendingApprovals} icon={icons.users} />
            <KpiCard label="Terminés ce mois" value={staffDash.completedThisMonth} icon={icons.revenue} />
          </div>
        ) : <SkeletonKpiGrid />}
        {staffDash?.activeOnMySeat && (
          <div className="mt-8 rounded-2xl border border-[#c9a227]/30 bg-[#c9a227]/10 p-6">
            <p className="text-sm font-semibold text-[#f0e6b8]">Client en cours</p>
            <p className="mt-2 text-white">{staffDash.activeOnMySeat.user.name} — {staffDash.activeOnMySeat.service.name}</p>
            <button type="button" onClick={() => staffAction(staffDash.activeOnMySeat!.id, "complete")}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 active:scale-95 transition-all cursor-pointer">
              Marquer terminé
            </button>
          </div>
        )}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white">File du jour</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {(staffDash?.queueToday ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <span>{r.user.name} — {r.service.name} — {formatDateTimeFr(r.scheduledAt)}</span>
                {r.status === "CONFIRMED" && (
                  <button type="button" onClick={() => staffAction(r.id, "start")}
                    className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/40 active:scale-95 cursor-pointer transition-all">Démarrer</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (role === "STAFF" && tab === "compte") return <DashboardCompte />;

  /* ═══════════════════ ADMIN TABS ═══════════════════ */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[#c9a227]">Administration</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-white">L&apos;Artiste</h1>
      </div>

      {/* ── DASHBOARD OVERVIEW ── */}
      {tab === "dash" && (
        <div className="space-y-8">
          {loadingStats ? <SkeletonKpiGrid /> : (
            <>
              {/* Row 1: Key metrics */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Aujourd'hui" value={stats?.clients.day ?? 0} icon={icons.calendar} sub="terminés" />
                <KpiCard label="Cette semaine" value={stats?.clients.week ?? 0} icon={icons.clock} sub="terminés" />
                <KpiCard label="Ce mois" value={stats?.clients.month ?? 0} icon={icons.users} sub="terminés" />
                <KpiCard label="Chiffre du mois" value={stats ? `${(stats.revenue.monthCents / 100).toFixed(0)} TND` : "0"} gold icon={icons.revenue} />
              </div>

              {/* Row 2: Status overview */}
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard label="En attente" value={stats?.pending ?? 0} sub="à valider" />
                <KpiCard label="Annulées" value={stats?.cancelledMonth ?? 0} sub="ce mois" />
                <KpiCard label="Clients inscrits" value={stats?.clients.total ?? 0} sub="total" />
              </div>
            </>
          )}

          {/* Chart */}
          {stats?.dailyChart && stats.dailyChart.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-sm font-semibold text-white/80 mb-4">7 derniers jours</h2>
              <MiniBarChart data={stats.dailyChart} />
            </div>
          )}

          {/* Live seats — compact */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold text-white/80 mb-4">Sièges en direct</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {(snapshot?.seats ?? []).map((s) => (
                <div key={s.seatNumber} className={`rounded-xl border px-4 py-3 ${s.status === "occupied" ? "border-[#c9a227]/30 bg-[#c9a227]/5" : "border-white/10 bg-black/20"}`}>
                  <p className="text-[10px] uppercase tracking-wider text-white/60">Siège {s.seatNumber}</p>
                  <p className="mt-1 text-sm font-medium text-white truncate">{s.status === "occupied" ? s.clientName : "Libre"}</p>
                  {s.remainingMinutes != null && <p className="text-[11px] text-[#c9a227]">~ {s.remainingMinutes} min</p>}
                </div>
              ))}
              {(!snapshot?.seats || snapshot.seats.length === 0) && <p className="text-sm text-white/50 col-span-5">Chargement…</p>}
            </div>
          </div>

          {/* Top services — compact list */}
          {stats?.topServices && stats.topServices.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-sm font-semibold text-white/80 mb-3">Top services (30 j.)</h2>
              <div className="space-y-1.5">
                {stats.topServices.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="text-white/70">{t.service?.name ?? "—"}</span>
                    <span className="text-[#c9a227] font-bold">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESERVATIONS ── */}
      {tab === "res" && (
        <div className="mt-4">
          <div className="mb-4 flex items-center gap-4">
            <select
              value={resStatus}
              onChange={(e) => { setResStatus(e.target.value); setResPage(1); }}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="CONFIRMED">Confirmée</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="COMPLETED">Terminée</option>
              <option value="CANCELLED">Annulée</option>
              <option value="REJECTED">Refusée</option>
            </select>
          </div>
          {loadingRes ? <SkeletonTable rows={8} cols={5} /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
                    <th className="py-3 pr-4">Client</th>
                    <th className="py-3 pr-4">Service</th>
                    <th className="py-3 pr-4">Créneau</th>
                    <th className="py-3 pr-4">Statut</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-white/85">
                  {reservations.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.user.name}</p>
                        <p className="text-xs text-white/55">{r.user.email}</p>
                      </td>
                      <td className="py-3 pr-4">{r.service.name}</td>
                      <td className="py-3 pr-4 whitespace-nowrap text-xs">{formatDateTimeFr(r.scheduledAt)}</td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[r.status] ?? ""}`} />
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.status === "PENDING" && (
                            <>
                              <button type="button" onClick={() => patchReservation(r.id, { action: "approve" })}
                                className="rounded-full bg-emerald-500/25 px-2.5 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/40 active:scale-95 cursor-pointer transition-all">Accepter</button>
                              <button type="button" onClick={() => patchReservation(r.id, { action: "reject" })}
                                className="rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] text-red-200 hover:bg-red-500/30 active:scale-95 cursor-pointer transition-all">Refuser</button>
                            </>
                          )}
                          {r.status === "CONFIRMED" && (
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map((n) => (
                                <button key={n} type="button" onClick={() => patchReservation(r.id, { status: "IN_PROGRESS", seatNumber: n })}
                                  className="rounded-full bg-blue-500/20 px-2 py-1 text-[11px] text-blue-200 hover:bg-blue-500/35 active:scale-95 cursor-pointer transition-all">S{n}</button>
                              ))}
                            </div>
                          )}
                          {r.status === "IN_PROGRESS" && (
                            <button type="button" onClick={() => patchReservation(r.id, { status: "COMPLETED" })}
                              className="rounded-full bg-green-500/20 px-3 py-1 text-[11px] text-green-200 hover:bg-green-500/35 active:scale-95 cursor-pointer transition-all">Terminer</button>
                          )}
                          {!["CANCELLED","COMPLETED","REJECTED"].includes(r.status) && (
                            <button type="button" onClick={() => patchReservation(r.id, { status: "CANCELLED" })}
                              className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/50 hover:bg-red-500/15 hover:text-red-200 active:scale-95 cursor-pointer transition-all">Annuler</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reservations.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-white/40">Aucune réservation trouvée.</td></tr>
                  )}
                </tbody>
              </table>
              {resTotalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button onClick={() => setResPage(p => Math.max(1, p - 1))} disabled={resPage === 1} aria-label="Page précédente" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer">Précédent</button>
                  <span className="text-sm text-white/60">Page {resPage} sur {resTotalPages}</span>
                  <button onClick={() => setResPage(p => Math.min(resTotalPages, p + 1))} disabled={resPage === resTotalPages} aria-label="Page suivante" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer">Suivant</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TEAM PERFORMANCE ── */}
      {tab === "equipe" && (
        <div className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold text-white">Performances par coiffeur</h2>
          {loadingTeam ? <SkeletonRows count={3} /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {team.map((t) => (
                <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c9a227]/15 text-sm font-bold text-[#c9a227]">{t.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-white/40">Siège {t.seatNumber ?? "—"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-8 text-sm">
                    <div><p className="text-[11px] uppercase tracking-wider text-white/50">Ce mois</p><p className="text-xl font-bold text-[#c9a227] mt-0.5">{t.completedThisMonth}</p></div>
                    <div><p className="text-[11px] uppercase tracking-wider text-white/50">Total</p><p className="text-xl font-bold text-white mt-0.5">{t.completedTotal}</p></div>
                  </div>
                </div>
              ))}
              {team.length === 0 && <p className="text-sm text-white/40">Aucun membre staff trouvé. Les performances s&apos;affichent quand un staff termine des réservations.</p>}
            </div>
          )}
        </div>
      )}

      {/* ── STAFF MANAGEMENT ── */}
      {tab === "staff" && (
        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Membres staff</h2>
            <button type="button" onClick={() => setStaffModal({ mode: "add" })}
              className="flex items-center gap-2 rounded-full bg-[#c9a227] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer">
              + Ajouter
            </button>
          </div>
          {loadingStaff ? <SkeletonRows count={3} /> : (
            <div className="space-y-3">
              {staffMembers.map((m) => (
                <div key={m.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c9a227]/15 text-sm font-bold text-[#c9a227]">{m.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-white">{m.name}</p>
                      <p className="text-sm text-white/60">{m.email}{m.phone ? ` • ${m.phone}` : ""} • Siège {m.seatNumber ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStaffModal({ mode: "edit", member: m })}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 active:scale-95 cursor-pointer transition-all">Modifier</button>
                    <button type="button" onClick={() => setStaffModal({ mode: "delete", member: m })}
                      className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10 active:scale-95 cursor-pointer transition-all">Supprimer</button>
                  </div>
                </div>
              ))}
              {staffMembers.length === 0 && <p className="text-sm text-white/40">Aucun membre staff.</p>}
            </div>
          )}
        </div>
      )}

      {/* ── CLIENTS ── */}
      {tab === "clients" && (
        <div className="mt-4 space-y-4">
          <input value={clientQuery} onChange={(e) => { setClientQuery(e.target.value); setClientsPage(1); }}
            placeholder="Rechercher (nom, e-mail, téléphone)"
            className="w-full max-w-md rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
          {loadingClients ? <SkeletonRows count={4} /> : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                {clients.map((c) => (
                  <div key={c.id}>
                    <button type="button" onClick={() => setSelectedClientId(selectedClientId === c.id ? null : c.id)}
                      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#c9a227]/30 hover:bg-white/[0.06] transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{c.name}</p>
                          <p className="text-sm text-white/60">{c.email}</p>
                          {c.phone && <p className="text-xs text-white/50">{c.phone}</p>}
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`text-white/40 transition-transform ${selectedClientId === c.id ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </button>
                    {selectedClientId === c.id && <ClientHistoryPanel clientId={c.id} onClose={() => setSelectedClientId(null)} />}
                  </div>
                ))}
                {clients.length === 0 && <p className="text-sm text-white/40 col-span-2">Aucun client trouvé.</p>}
              </div>
              
              {clientsTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <button onClick={() => setClientsPage(p => Math.max(1, p - 1))} disabled={clientsPage === 1} aria-label="Page précédente" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer">Précédent</button>
                  <span className="text-sm text-white/60">Page {clientsPage} sur {clientsTotalPages}</span>
                  <button onClick={() => setClientsPage(p => Math.min(clientsTotalPages, p + 1))} disabled={clientsPage === clientsTotalPages} aria-label="Page suivante" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer">Suivant</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SERVICES CRUD ── */}
      {tab === "services" && (
        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Services</h2>
            <button type="button" onClick={() => setServiceModal({ mode: "add" })}
              className="flex items-center gap-2 rounded-full bg-[#c9a227] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer">
              + Ajouter
            </button>
          </div>
          {loadingServices ? <SkeletonRows count={4} /> : (
            <div className="space-y-3">
              {services.map((s) => (
                <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${s.active ? "bg-[#c9a227]/15 text-[#c9a227]" : "bg-white/5 text-white/30"}`}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{s.name}
                          {!s.active && <span className="ml-2 text-[10px] uppercase tracking-wider text-white/50 border border-white/10 rounded-full px-1.5 py-0.5">inactif</span>}
                        </p>
                        <p className="text-sm text-white/60">
                          {(s.priceCents / 100).toFixed(2)} TND • {s.durationMinutes} min
                          {s.category && ` • ${s.category}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setServiceModal({ mode: "edit", service: s })}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 active:scale-95 cursor-pointer transition-all">Modifier</button>
                      <button type="button" onClick={() => setServiceModal({ mode: "delete", service: s })}
                        className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10 active:scale-95 cursor-pointer transition-all">Supprimer</button>
                    </div>
                  </div>
                  {s.description && <p className="mt-2 text-xs text-white/60 ml-[52px]">{s.description}</p>}
                </div>
              ))}
              {services.length === 0 && <p className="text-sm text-white/40">Aucun service configuré.</p>}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWS ── */}
      {tab === "reviews" && (
        <div className="mt-4 space-y-8">
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
              className="rounded-full bg-[#c9a227] px-5 py-2 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer">Ajouter</button>
          </form>
          {loadingReviews ? <SkeletonRows count={3} /> : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{r.authorName}</p>
                        <span className="text-xs text-[#c9a227]">{"★".repeat(r.rating)}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${r.published ? "border-emerald-500/30 text-emerald-300" : "border-white/10 text-white/60"}`}>
                          {r.published ? "Publié" : "Masqué"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/70">{r.text}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => toggleReview(r.id, !r.published)}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/5 active:scale-95 cursor-pointer transition-all">
                        {r.published ? "Masquer" : "Publier"}
                      </button>
                      <button type="button" onClick={() => deleteReview(r.id)}
                        className="rounded-full border border-red-400/20 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10 active:scale-95 cursor-pointer transition-all">Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === "settings" && (
        <div className="mt-4 max-w-2xl space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Horaires &amp; créneaux</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-white/60">Ouverture</label>
                <input value={businessHours.open} onChange={(e) => setBusinessHours((h) => ({ ...h, open: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/60">Fermeture</label>
                <input value={businessHours.close} onChange={(e) => setBusinessHours((h) => ({ ...h, close: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/60">Créneau (min)</label>
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
                <label className="text-xs uppercase tracking-wider text-white/60">Téléphone</label>
                <input value={settingsContact.phone} onChange={(e) => setSettingsContact((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="+216 XX XXX XXX"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/60">WhatsApp</label>
                <input value={settingsContact.whatsapp} onChange={(e) => setSettingsContact((s) => ({ ...s, whatsapp: e.target.value }))}
                  placeholder="+21620392769"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-white/60">Adresse du salon</label>
                <input value={settingsContact.salonAddress} onChange={(e) => setSettingsContact((s) => ({ ...s, salonAddress: e.target.value }))}
                  placeholder="Rue Ibn Khaldoun, Kairouan"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-white/60">E-mail admin</label>
                <input type="email" value={settingsContact.adminEmail} onChange={(e) => setSettingsContact((s) => ({ ...s, adminEmail: e.target.value }))}
                  placeholder="admin@salon.tn"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#c9a227]/40" />
              </div>
            </div>
          </div>
          <button type="button" onClick={saveSettings} disabled={savingSettings}
            className="rounded-full bg-[#c9a227] px-6 py-3 text-sm font-semibold text-black hover:bg-[#e4c04a] active:scale-95 transition-all cursor-pointer disabled:opacity-60">
            {savingSettings ? "Enregistrement…" : "Enregistrer les paramètres"}
          </button>
        </div>
      )}

      {tab === "media" && <AdminMediaPanel />}
      {tab === "compte" && <DashboardCompte />}

      {/* Modals */}
      {staffModal && (
        <StaffModal mode={staffModal.mode}
          initial={staffModal.member ? { id: staffModal.member.id, name: staffModal.member.name, email: staffModal.member.email, phone: staffModal.member.phone ?? "", seatNumber: staffModal.member.seatNumber ?? 1 } : undefined}
          targetName={staffModal.member?.name}
          onConfirm={handleStaffConfirm} onClose={() => setStaffModal(null)} />
      )}
      {serviceModal && (
        <ServiceModal mode={serviceModal.mode}
          initial={serviceModal.service ? { id: serviceModal.service.id, name: serviceModal.service.name, slug: serviceModal.service.slug, description: serviceModal.service.description ?? "", priceCents: serviceModal.service.priceCents, durationMinutes: serviceModal.service.durationMinutes, category: serviceModal.service.category ?? "", active: serviceModal.service.active } : undefined}
          targetName={serviceModal.service?.name}
          onConfirm={handleServiceConfirm} onClose={() => setServiceModal(null)} />
      )}
    </div>
  );
}
