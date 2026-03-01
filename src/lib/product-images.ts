const PRODUCT_IMAGE_PATH_RE = /^(\/archive\/assets\/products\/[^/.]+?)(?:-(480|900))?\.jpg$/i;

export function isLocalProductAsset(src?: string) {
  return typeof src === "string" && PRODUCT_IMAGE_PATH_RE.test(src);
}

export function getPreferredProductImageSrc(src: string, fallbackSrc?: string) {
  if (isLocalProductAsset(fallbackSrc)) {
    return fallbackSrc;
  }

  return src;
}

export function getProductAssetVariantUrl(src: string, width: number) {
  const match = src.match(PRODUCT_IMAGE_PATH_RE);
  if (!match) return src;

  const basePath = match[1];

  if (width <= 480) {
    return `${basePath}-480.jpg`;
  }

  if (width <= 900) {
    return `${basePath}-900.jpg`;
  }

  return `${basePath}.jpg`;
}

export function getProductDisplaySrc(
  src: string,
  variant: "grid" | "detail" | "thumb"
) {
  if (variant === "thumb") {
    return getProductAssetVariantUrl(src, 480);
  }

  if (variant === "grid") {
    return getProductAssetVariantUrl(src, 900);
  }

  return src;
}

export function getProductImageBlurDataUrl() {
  return "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23101010'/%3E%3Cstop offset='1' stop-color='%23221919'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='48' height='48' fill='url(%23g)'/%3E%3C/svg%3E";
}

export function warmProductImage(src: string, width = 900) {
  if (typeof window === "undefined") return;

  const img = new window.Image();
  img.src = getProductAssetVariantUrl(src, width);
}
