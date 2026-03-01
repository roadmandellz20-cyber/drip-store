const LAUNCH_AT_RAW = process.env.NEXT_PUBLIC_LAUNCH_AT?.trim() || process.env.LAUNCH_AT?.trim() || "";

export function getLaunchDate() {
  if (!LAUNCH_AT_RAW) return null;

  const launchDate = new Date(LAUNCH_AT_RAW);
  return Number.isNaN(launchDate.getTime()) ? null : launchDate;
}

export function isLaunchLive(now = Date.now()) {
  const launchDate = getLaunchDate();
  if (!launchDate) return true;
  return now >= launchDate.getTime();
}
