"use client";

import { useEffect, useMemo, useState } from "react";

function parseLaunchDate() {
  const raw = process.env.NEXT_PUBLIC_LAUNCH_AT || "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export default function LaunchCountdown({
  variant = "banner",
}: {
  variant?: "banner" | "inline";
}) {
  const launchDate = useMemo(() => parseLaunchDate(), []);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!launchDate) return;
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

  const diff = launchDate.getTime() - now;
  const isLive = diff <= 0;

  const totalSeconds = Math.floor(Math.max(0, diff) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (variant === "inline") {
    return (
      <div className="launchInline">
        {isLive ? (
          <span className="launchInline__live">DROP IS LIVE</span>
        ) : (
          <>
            <span className="launchInline__label">DROP OPENS IN</span>
            <span className="launchInline__time">
              {days}D {pad2(hours)}:{pad2(mins)}:{pad2(secs)}
            </span>
          </>
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
              <div className="launchTimer__num">{days}</div>
              <div className="launchTimer__label">DAYS</div>
            </div>
            <div className="launchTimer__unit">
              <div className="launchTimer__num">{pad2(hours)}</div>
              <div className="launchTimer__label">HRS</div>
            </div>
            <div className="launchTimer__unit">
              <div className="launchTimer__num">{pad2(mins)}</div>
              <div className="launchTimer__label">MIN</div>
            </div>
            <div className="launchTimer__unit">
              <div className="launchTimer__num">{pad2(secs)}</div>
              <div className="launchTimer__label">SEC</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
