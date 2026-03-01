"use client";

import { useEffect, useState } from "react";
import { isLaunchLive } from "@/lib/launch";

export function useLaunchLive() {
  const [live, setLive] = useState(() => isLaunchLive());

  useEffect(() => {
    const t = window.setInterval(() => {
      const next = isLaunchLive();
      setLive((current) => (current === next ? current : next));
    }, 1000);

    return () => window.clearInterval(t);
  }, []);

  return live;
}
