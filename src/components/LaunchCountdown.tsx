"use client";

import { useEffect, useMemo, useState } from "react";
import { getLaunchDate, isLaunchLive } from "@/lib/launch";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export default function LaunchCountdown({
  variant = "banner",
}: {
  variant?: "banner" | "inline";
}) {
  const launchDate = useMemo(() => getLaunchDate(), []);
  const initialLive = useMemo(() => isLaunchLive(), []);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!launchDate) return;

    const tick = () => setNow(Date.now());
    tick();

    if (Date.now() >= launchDate.getTime()) return;

    const t = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= launchDate.getTime()) {
        window.clearInterval(t);
      }
    }, 1000);

    return () => window.clearInterval(t);
  }, [launchDate]);

  if (!launchDate) return null;

  const diff = now === null ? (initialLive ? 0 : 1) : launchDate.getTime() - now;
  const isLive = diff <= 0;
  const hasHydrated = now !== null;

  const totalSeconds = Math.floor(Math.max(0, diff) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const inlineTimeText = hasHydrated
    ? `${days}D ${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`
    : "--D --:--:--";
  const inlineDisplayText = `DROP OPENS IN / ${inlineTimeText}`;

  if (variant === "inline") {
    return (
      <div className="launchInline">
        {isLive ? (
          <span className="launchInline__live">DROP IS LIVE</span>
        ) : (
          <span className="launchInline__time">{inlineDisplayText}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`launchBanner ${isLive ? "launchBanner--live" : ""}`}>
      <div className="launchBanner__left">
        <div className="launchBanner__kicker">MUGEN DISTRICT</div>
        <div className="launchBanner__title">
          {isLive ? "DROP IS LIVE" : "ARCHIVE DROP LOCKED"}
        </div>
        <div className="launchBanner__sub">
          {isLive
            ? "The archive is open. Enter the Mugen."
            : "Products are visible. Ordering unlocks April 1."}
        </div>
      </div>

      <div className="launchBanner__right">
        {isLive ? (
          <div className="launchBanner__pill">ENTER THE MUGEN</div>
        ) : (
          <div className="launchTimer" aria-label="Launch countdown">
            <div className="launchTimer__unit">
              <div className="launchTimer__num">{hasHydrated ? days : "--"}</div>
              <div className="launchTimer__label">DAYS</div>
            </div>
            <div className="launchTimer__unit">
              <div className="launchTimer__num">{hasHydrated ? pad2(hours) : "--"}</div>
              <div className="launchTimer__label">HRS</div>
            </div>
            <div className="launchTimer__unit">
              <div className="launchTimer__num">{hasHydrated ? pad2(mins) : "--"}</div>
              <div className="launchTimer__label">MIN</div>
            </div>
            <div className="launchTimer__unit">
              <div className="launchTimer__num">{hasHydrated ? pad2(secs) : "--"}</div>
              <div className="launchTimer__label">SEC</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
