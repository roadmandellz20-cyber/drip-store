import type { Metadata } from "next";
import Link from "next/link";
import ProductDetailClient from "./ProductDetailClient";
import { sanitizeSlugInput } from "@/lib/input";
import { fetchProductBySlug, fetchRelatedProducts } from "@/lib/products-server";
import { absoluteUrl, extractSummary } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await fetchProductBySlug(sanitizeSlugInput(resolvedParams.id, 64));

  if (!product) {
    return {
      title: "Product Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = extractSummary(product.description);
  const image = product.imageFallbackUrl || product.imageUrl;
  const canonicalPath = `/product/${product.sku}`;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: product.name,
      description,
      url: absoluteUrl(canonicalPath),
      type: "website",
      images: [
        {
          url: absoluteUrl(image),
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [absoluteUrl(image)],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const productId = sanitizeSlugInput(resolvedParams.id, 64);
  const product = await fetchProductBySlug(productId);
  const relatedProducts = product ? await fetchRelatedProducts(product, 3) : [];

  if (!product) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">NOT FOUND</h1>
          <p className="page__sub">That product doesn’t exist.</p>
          <Link className="btn btn--primary" href="/store">
            Back to store →
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetailClient initialProduct={product} relatedProducts={relatedProducts} />;
}
