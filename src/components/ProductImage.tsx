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

export default function ProductImage({
  src,
  fallbackSrc,
  alt,
  ...props
}: ProductImageProps) {
  const preferredSrc = getPreferredProductImageSrc(src, fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState(preferredSrc);

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
        if (currentSrc !== src) {
          setCurrentSrc(src);
          return;
        }

        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
