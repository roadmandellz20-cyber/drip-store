"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type TrustedNowValue = {
  now: number;
  synced: boolean;
};

type TrustedNowBaseline = {
  now: number;
  startedAt: number;
};

const TICK_INTERVAL_MS = 1000;
const RESYNC_INTERVAL_MS = 5 * 60 * 1000;

const TrustedNowContext = createContext<TrustedNowValue>({
  now: Date.now(),
  synced: false,
});

export default function TrustedNowProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<TrustedNowValue>(() => ({
    now: Date.now(),
    synced: false,
  }));
  const baselineRef = useRef<TrustedNowBaseline | null>(null);

  useEffect(() => {
    baselineRef.current = {
      now: Date.now(),
      startedAt: performance.now(),
    };

    const tick = () => {
      if (!baselineRef.current) return;

      const elapsedMs = performance.now() - baselineRef.current.startedAt;
      const nextNow = Math.round(baselineRef.current.now + elapsedMs);

      setValue((current) => {
        if (current.now === nextNow) return current;
        return { now: nextNow, synced: current.synced };
      });
    };

    const applyServerNow = (serverNow: number) => {
      baselineRef.current = {
        now: serverNow,
        startedAt: performance.now(),
      };
      setValue({ now: serverNow, synced: true });
    };

    const syncWithServer = async () => {
      const requestStartedAt = performance.now();

      try {
        const response = await fetch("/api/now", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { now?: unknown };
        if (typeof payload.now !== "number" || Number.isNaN(payload.now)) return;

        const responseReceivedAt = performance.now();
        const adjustedNow = Math.round(payload.now + (responseReceivedAt - requestStartedAt) / 2);
        applyServerNow(adjustedNow);
      } catch {
        // Keep the optimistic local clock if the sync request fails.
      }
    };

    tick();

    const tickId = window.setInterval(tick, TICK_INTERVAL_MS);
    const syncId = window.setInterval(() => {
      void syncWithServer();
    }, RESYNC_INTERVAL_MS);

    void syncWithServer();

    return () => {
      window.clearInterval(tickId);
      window.clearInterval(syncId);
    };
  }, []);

  return <TrustedNowContext.Provider value={value}>{children}</TrustedNowContext.Provider>;
}

export function useTrustedNow() {
  return useContext(TrustedNowContext);
}
