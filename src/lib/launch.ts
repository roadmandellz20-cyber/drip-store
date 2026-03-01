const LAUNCH_AT_RAW = process.env.NEXT_PUBLIC_LAUNCH_AT?.trim() || process.env.LAUNCH_AT?.trim() || "";
const FORCE_LAUNCH_LIVE_RAW =
  process.env.NEXT_PUBLIC_FORCE_LAUNCH_LIVE?.trim() || process.env.FORCE_LAUNCH_LIVE?.trim() || "";
const FORCE_LAUNCH_LIVE_UNTIL_RAW =
  process.env.NEXT_PUBLIC_FORCE_LAUNCH_LIVE_UNTIL?.trim() ||
  process.env.FORCE_LAUNCH_LIVE_UNTIL?.trim() ||
  "";

function asBooleanFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function getDefaultLaunchDate(now = new Date()) {
  return new Date(now.getFullYear(), 3, 1, 0, 0, 0, 0);
}

function getConfiguredLaunchDate(now = new Date()) {
  if (!LAUNCH_AT_RAW) {
    return getDefaultLaunchDate(now);
  }

  const launchDate = new Date(LAUNCH_AT_RAW);
  return Number.isNaN(launchDate.getTime()) ? getDefaultLaunchDate(now) : launchDate;
}

function getForceLaunchLiveUntilDate() {
  if (!FORCE_LAUNCH_LIVE_UNTIL_RAW) return null;

  const overrideUntil = new Date(FORCE_LAUNCH_LIVE_UNTIL_RAW);
  return Number.isNaN(overrideUntil.getTime()) ? null : overrideUntil;
}

function hasLaunchOverride(now = Date.now()) {
  if (asBooleanFlag(FORCE_LAUNCH_LIVE_RAW)) {
    return true;
  }

  const overrideUntil = getForceLaunchLiveUntilDate();
  return Boolean(overrideUntil && now <= overrideUntil.getTime());
}

export function getLaunchDate(now = new Date()) {
  if (hasLaunchOverride(now.getTime())) {
    return new Date(0);
  }

  return getConfiguredLaunchDate(now);
}

export function isLaunchLive(now = Date.now()) {
  if (hasLaunchOverride(now)) {
    return true;
  }

  const launchDate = getConfiguredLaunchDate(new Date(now));
  return now >= launchDate.getTime();
}
