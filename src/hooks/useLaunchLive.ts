"use client";

import { useTrustedNow } from "@/components/TrustedNowProvider";
import { isLaunchLive } from "@/lib/launch";

export function useLaunchLive() {
  const { now, synced } = useTrustedNow();
  return synced ? isLaunchLive(now) : false;
}
