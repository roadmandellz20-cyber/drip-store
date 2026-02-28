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

export function warmProductImage(src: string, width = 900) {
  if (typeof window === "undefined") return;

  const img = new window.Image();
  img.src = getProductAssetVariantUrl(src, width);
}
