"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

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
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <Image
      {...props}
      alt={alt}
      quality={70}
      src={currentSrc}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
