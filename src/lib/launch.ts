export function isLaunchLive() {
  const raw = process.env.NEXT_PUBLIC_LAUNCH_AT || "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return true;
  return Date.now() >= d.getTime();
}
