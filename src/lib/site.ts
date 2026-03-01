const DEFAULT_SITE_URL = "https://mugendistrict.com";

export const SITE_NAME = "MUGEN DISTRICT";
export const SITE_DESCRIPTION =
  "Anime streetwear from Mugen District. Limited archive pieces, no restocks, and Tokyo-grunge energy built for the drop.";
export const SITE_OG_IMAGE = "/archive/assets/hero-bg.jpg";

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    DEFAULT_SITE_URL;

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, "");
  }

  return `https://${raw.replace(/\/$/, "")}`;
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function extractSummary(description: string, maxLength = 160) {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}
