import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

function ShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070707] text-white/60">
      Chargement…
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
