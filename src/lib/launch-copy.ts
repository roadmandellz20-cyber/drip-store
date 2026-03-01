export const LOCKED_PROMO_TEXT = "DROP LOCKED • OPENS APRIL 1 • LIMITED QTY • NO RESTOCKS";
export const LIVE_PROMO_TEXT = "DROP LIVE • SHIPS IN 24–48H • NO RESTOCKS";

export function getPromoTickerText(launchLive: boolean) {
  return launchLive ? LIVE_PROMO_TEXT : LOCKED_PROMO_TEXT;
}
