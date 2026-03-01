const LAUNCH_AT_RAW = process.env.NEXT_PUBLIC_LAUNCH_AT?.trim() || process.env.LAUNCH_AT?.trim() || "";

function getDefaultLaunchDate(now = new Date()) {
  return new Date(now.getFullYear(), 3, 1, 0, 0, 0, 0);
}

export function getLaunchDate() {
  if (!LAUNCH_AT_RAW) {
    return getDefaultLaunchDate();
  }

  const launchDate = new Date(LAUNCH_AT_RAW);
  return Number.isNaN(launchDate.getTime()) ? getDefaultLaunchDate() : launchDate;
}

export function isLaunchLive(now = Date.now()) {
  const launchDate = getLaunchDate();
  return now >= launchDate.getTime();
}
