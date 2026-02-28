"use client";

import { useEffect, useState } from "react";
import { isLaunchLive } from "@/lib/launch";

export function useLaunchLive() {
  const [live, setLive] = useState(() => isLaunchLive());

  useEffect(() => {
    if (live) return;

    const t = window.setInterval(() => {
      const next = isLaunchLive();
      setLive(next);
      if (next) {
        window.clearInterval(t);
      }
    }, 1000);

    return () => window.clearInterval(t);
  }, [live]);

  return live;
}
