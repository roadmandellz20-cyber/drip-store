"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type SyntheticEvent } from "react";
import {
  getProductDisplaySrc,
  getProductImageBlurDataUrl,
  getPreferredProductImageSrc,
} from "@/lib/product-images";

type ProductImageProps = Omit<ImageProps, "src" | "quality"> & {
  src: string;
  fallbackSrc?: string;
  variant?: "grid" | "detail" | "thumb";
  onLoadStateChange?: (loaded: boolean) => void;
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
  variant = "grid",
  className,
  loading,
  onError,
  onLoad,
  onLoadStateChange,
  priority,
  ...props
}: ProductImageProps) {
  const safeSrc = toSafeSrc(src);
  const safeFallbackSrc = toSafeSrc(fallbackSrc);
  const preferredSrc = toSafeSrc(
    getProductDisplaySrc(toSafeSrc(getPreferredProductImageSrc(safeSrc, safeFallbackSrc)), variant)
  );
  return (
    <ResolvedProductImage
      key={`${preferredSrc}:${variant}`}
      {...props}
      alt={alt}
      className={className}
      fallbackSrc={safeFallbackSrc}
      loading={loading}
      onError={onError}
      onLoad={onLoad}
      onLoadStateChange={onLoadStateChange}
      preferredSrc={preferredSrc}
      priority={priority}
      safeSrc={safeSrc}
      variant={variant}
    />
  );
}

function ResolvedProductImage({
  alt,
  className,
  fallbackSrc,
  loading,
  onError,
  onLoad,
  onLoadStateChange,
  preferredSrc,
  priority,
  safeSrc,
  variant,
  ...props
}: Omit<ProductImageProps, "src" | "fallbackSrc"> & {
  fallbackSrc: string;
  preferredSrc: string;
  safeSrc: string;
}) {
  const [currentSrc, setCurrentSrc] = useState<string>(preferredSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const blurDataURL = getProductImageBlurDataUrl();
  const imageClassName = [className, isLoaded ? "is-loaded" : "is-loading"].filter(Boolean).join(" ");

  const markLoaded = (event: SyntheticEvent<HTMLImageElement>) => {
    if (!isLoaded) {
      setIsLoaded(true);
      onLoadStateChange?.(true);
    }

    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (currentSrc !== safeSrc) {
      setIsLoaded(false);
      onLoadStateChange?.(false);
      setCurrentSrc(safeSrc);
      onError?.(event);
      return;
    }

    if (currentSrc !== fallbackSrc) {
      setIsLoaded(false);
      onLoadStateChange?.(false);
      setCurrentSrc(fallbackSrc);
    }

    onError?.(event);
  };

  return (
    <Image
      {...props}
      alt={alt}
      placeholder="blur"
      blurDataURL={blurDataURL}
      className={imageClassName}
      loading={priority ? undefined : loading ?? "lazy"}
      priority={priority}
      quality={variant === "detail" ? 82 : variant === "thumb" ? 58 : 72}
      src={currentSrc}
      onError={handleError}
      onLoad={markLoaded}
    />
  );
}
