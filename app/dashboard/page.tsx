import { Suspense } from "react";
import { DashboardApp } from "@/components/dashboard/DashboardApp";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/50">Chargement…</div>}>
      <DashboardApp />
    </Suspense>
  );
}
