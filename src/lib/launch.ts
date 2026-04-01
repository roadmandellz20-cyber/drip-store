const ENV_LAUNCH_CONFIG = {
  launchAtRaw: process.env.NEXT_PUBLIC_LAUNCH_AT?.trim() || process.env.LAUNCH_AT?.trim() || "",
  forceLaunchLiveRaw:
    process.env.NEXT_PUBLIC_FORCE_LAUNCH_LIVE?.trim() || process.env.FORCE_LAUNCH_LIVE?.trim() || "",
  forceLaunchLiveUntilRaw:
    process.env.NEXT_PUBLIC_FORCE_LAUNCH_LIVE_UNTIL?.trim() ||
    process.env.FORCE_LAUNCH_LIVE_UNTIL?.trim() ||
    "",
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_NO_TZ_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const DATE_TIME_WITH_TZ_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/i;

export type LaunchConfigOverrides = {
  launchAtRaw?: string;
  forceLaunchLiveRaw?: string;
  forceLaunchLiveUntilRaw?: string;
};

function buildUtcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
) {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }

  return date;
}

function getLaunchConfig(overrides: LaunchConfigOverrides = {}) {
  return {
    launchAtRaw: overrides.launchAtRaw ?? ENV_LAUNCH_CONFIG.launchAtRaw,
    forceLaunchLiveRaw: overrides.forceLaunchLiveRaw ?? ENV_LAUNCH_CONFIG.forceLaunchLiveRaw,
    forceLaunchLiveUntilRaw:
      overrides.forceLaunchLiveUntilRaw ?? ENV_LAUNCH_CONFIG.forceLaunchLiveUntilRaw,
  };
}

function asBooleanFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function getDefaultLaunchDate(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), 3, 30, 0, 0, 0, 0));
}

export function parseLaunchDateInput(raw: string) {
  const value = raw.trim();
  if (!value) return null;

  const dateOnlyMatch = value.match(DATE_ONLY_RE);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return buildUtcDate(Number(year), Number(month), Number(day));
  }

  const dateTimeNoTzMatch = value.match(DATE_TIME_NO_TZ_RE);
  if (dateTimeNoTzMatch) {
    const [, year, month, day, hour, minute, second = "0", millisecond = "0"] = dateTimeNoTzMatch;
    return buildUtcDate(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond.padEnd(3, "0"))
    );
  }

  if (DATE_TIME_WITH_TZ_RE.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function getConfiguredLaunchDate(now = new Date(), overrides: LaunchConfigOverrides = {}) {
  const { launchAtRaw } = getLaunchConfig(overrides);

  if (!launchAtRaw) {
    return getDefaultLaunchDate(now);
  }

  return parseLaunchDateInput(launchAtRaw) ?? getDefaultLaunchDate(now);
}

function getForceLaunchLiveUntilDate(overrides: LaunchConfigOverrides = {}) {
  const { forceLaunchLiveUntilRaw } = getLaunchConfig(overrides);
  if (!forceLaunchLiveUntilRaw) return null;

  return parseLaunchDateInput(forceLaunchLiveUntilRaw);
}

function hasLaunchOverride(now = Date.now(), overrides: LaunchConfigOverrides = {}) {
  const { forceLaunchLiveRaw } = getLaunchConfig(overrides);

  if (asBooleanFlag(forceLaunchLiveRaw)) {
    return true;
  }

  const overrideUntil = getForceLaunchLiveUntilDate(overrides);
  return Boolean(overrideUntil && now <= overrideUntil.getTime());
}

export function getLaunchDate(now = new Date(), overrides: LaunchConfigOverrides = {}) {
  if (hasLaunchOverride(now.getTime(), overrides)) {
    return new Date(0);
  }

  return getConfiguredLaunchDate(now, overrides);
}

export function isLaunchLive(now = Date.now(), overrides: LaunchConfigOverrides = {}) {
  if (hasLaunchOverride(now, overrides)) {
    return true;
  }

  const launchDate = getConfiguredLaunchDate(new Date(now), overrides);
  return now >= launchDate.getTime();
}
