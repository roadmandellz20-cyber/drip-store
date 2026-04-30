export const LAUNCH_DAY_TEXT = "April 30";
export const LAUNCH_DAY_TEXT_UPPER = "APRIL 30";
export const LAUNCH_AT_TEXT = "April 30 (00:00)";
export const LOCKED_BUTTON_TEXT = `LOCKED — Opens ${LAUNCH_DAY_TEXT}`;
export const LOCKED_STOCK_NOTE_TEXT = `Opens ${LAUNCH_AT_TEXT}`;
export const LOCKED_STOCK_FALLBACK_TEXT = `DROPS ${LAUNCH_DAY_TEXT_UPPER}`;
export const LOCKED_WAITLIST_TOAST_TEXT = `You’re in. ${LAUNCH_DAY_TEXT} — don’t blink.`;
export const LOCKED_ORDERING_UNLOCKS_TEXT = `Products are visible. Ordering unlocks ${LAUNCH_DAY_TEXT}.`;
export const LOCKED_PROMO_TEXT = `DROP LOCKED • OPENS ${LAUNCH_DAY_TEXT_UPPER} • LIMITED QTY • NO RESTOCKS`;
export const LIVE_PROMO_TEXT = "DROP LIVE • SHIPS IN 24–48H • NO RESTOCKS";

export function getPromoTickerText(launchLive: boolean) {
  return launchLive ? LIVE_PROMO_TEXT : LOCKED_PROMO_TEXT;
}
