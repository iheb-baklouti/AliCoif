"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { SalonSnapshot } from "@/lib/salon";

export function useSalonSocket() {
  const [snapshot, setSnapshot] = useState<SalonSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  async function refresh() {
    const r = await fetch("/api/salon/state");
    if (r.ok) {
      const j = (await r.json()) as SalonSnapshot;
      setSnapshot(j);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    let socket: Socket | undefined;
    const poll = () => {
      void refresh();
    };
    const pollId = window.setInterval(() => {
      poll();
    }, 20_000);
    try {
      socket = io({
        path: "/socket.io/",
        transports: ["websocket", "polling"],
      });
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.on("salon:update", (payload: SalonSnapshot) => {
        setSnapshot(payload);
      });
    } catch {
      setConnected(false);
    }
    return () => {
      window.clearInterval(pollId);
      socket?.disconnect();
    };
  }, []);

  return { snapshot, connected, refresh };
}
