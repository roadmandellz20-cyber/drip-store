"use client";

import { useMemo } from "react";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { getPromoTickerText } from "@/lib/launch-copy";

export default function ArchiveFeedTicker() {
  const launchLive = useLaunchLive();
  const tickerText = useMemo(() => getPromoTickerText(launchLive), [launchLive]);
  const row = `${tickerText} • ${tickerText} • ${tickerText} • `;

  return (
    <section className="ticker">
      <div className="ticker__label">ARCHIVE FEED</div>
      <div className="ticker__track">
        <div className="ticker__row">{row}</div>
        <div className="ticker__row ticker__row--alt">{row}</div>
      </div>
    </section>
  );
}
