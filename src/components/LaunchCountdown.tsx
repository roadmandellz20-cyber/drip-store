"use client";

import { useMemo } from "react";
import { useTrustedNow } from "@/components/TrustedNowProvider";
import { LOCKED_ORDERING_UNLOCKS_TEXT } from "@/lib/launch-copy";
import { getLaunchDate } from "@/lib/launch";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function CountdownUnits({
  days,
  hours,
  mins,
  secs,
}: {
  days: number;
  hours: number;
  mins: number;
  secs: number;
}) {
  return (
    <>
      <div className="launchTimer__unit">
        <div className="launchTimer__num" suppressHydrationWarning>
          {days}
        </div>
        <div className="launchTimer__label">DAYS</div>
      </div>
      <div className="launchTimer__unit">
        <div className="launchTimer__num" suppressHydrationWarning>
          {pad2(hours)}
        </div>
        <div className="launchTimer__label">HRS</div>
      </div>
      <div className="launchTimer__unit">
        <div className="launchTimer__num" suppressHydrationWarning>
          {pad2(mins)}
        </div>
        <div className="launchTimer__label">MIN</div>
      </div>
      <div className="launchTimer__unit">
        <div className="launchTimer__num" suppressHydrationWarning>
          {pad2(secs)}
        </div>
        <div className="launchTimer__label">SEC</div>
      </div>
    </>
  );
}

export default function LaunchCountdown({
  variant = "banner",
}: {
  variant?: "banner" | "inline";
}) {
  const { now, synced } = useTrustedNow();
  const launchDate = useMemo(() => getLaunchDate(new Date(now)), [now]);

  if (!launchDate) return null;

  const diff = launchDate.getTime() - now;
  const isLive = synced && diff <= 0;

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
          <div className="launchTimer launchTimer--inline" aria-label="Launch countdown">
            <CountdownUnits days={days} hours={hours} mins={mins} secs={secs} />
          </div>
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
            : LOCKED_ORDERING_UNLOCKS_TEXT}
        </div>
      </div>

      <div className="launchBanner__right">
        {isLive ? (
          <div className="launchBanner__pill">ENTER THE MUGEN</div>
        ) : (
          <div className="launchTimer" aria-label="Launch countdown">
            <CountdownUnits days={days} hours={hours} mins={mins} secs={secs} />
          </div>
        )}
      </div>
    </div>
  );
}
