"use client";

import { useEffect, useState, useCallback } from "react";
import type { SalonSnapshot } from "@/lib/salon";

/**
 * Hook de suivi du salon — polling uniquement (compatible Vercel serverless).
 * Le vrai push via Socket.IO nécessite un serveur Node.js persistent qui n'est
 * pas disponible sur Vercel. On utilise un rafraîchissement auto toutes les 20 s.
 */
export function useSalonSocket() {
  const [snapshot, setSnapshot] = useState<SalonSnapshot | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/salon/state");
      if (r.ok) {
        const j = (await r.json()) as SalonSnapshot;
        setSnapshot(j);
      }
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { snapshot, connected: true, refresh };
}
