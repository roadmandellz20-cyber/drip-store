"use client";

import Image, { type ImageLoaderProps, type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import {
  getPreferredProductImageSrc,
  getProductAssetVariantUrl,
} from "@/lib/product-images";

type ProductImageProps = Omit<ImageProps, "src" | "quality"> & {
  src: string;
  fallbackSrc?: string;
};

const PLACEHOLDER_SRC =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200' viewBox='0 0 1200 1200'%3E%3Crect width='1200' height='1200' fill='%23090909'/%3E%3C/svg%3E";

function toSafeSrc(value?: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || PLACEHOLDER_SRC;
}

export default function ProductImage({
  src,
  fallbackSrc,
  alt,
  ...props
}: ProductImageProps) {
  const safeSrc = toSafeSrc(src);
  const safeFallbackSrc = toSafeSrc(fallbackSrc);
  const preferredSrc = toSafeSrc(getPreferredProductImageSrc(safeSrc, safeFallbackSrc));
  const [currentSrc, setCurrentSrc] = useState<string>(preferredSrc);

  useEffect(() => {
    setCurrentSrc(preferredSrc);
  }, [preferredSrc]);

  const loader = ({ src: imageSrc, width }: ImageLoaderProps) =>
    getProductAssetVariantUrl(imageSrc, width);

  return (
    <Image
      {...props}
      alt={alt}
      loader={loader}
      quality={70}
      src={currentSrc}
      onError={() => {
        if (currentSrc !== safeSrc) {
          setCurrentSrc(safeSrc);
          return;
        }

        if (currentSrc !== safeFallbackSrc) {
          setCurrentSrc(safeFallbackSrc);
        }
      }}
    />
  );
}
