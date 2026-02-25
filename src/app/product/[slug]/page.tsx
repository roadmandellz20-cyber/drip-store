"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { addToCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,title,slug,description,price_cents,currency,cover_image_url,images,sizes")
        .eq("slug", slug)
        .single();
      setP(data);
      setSize(data?.sizes?.[0] || "M");
    })();
  }, [slug]);

  const images = useMemo(() => {
    if (!p) return [];
    const arr = [p.cover_image_url, ...(p.images || [])].filter(Boolean);
    return arr.length ? arr : ["https://placehold.co/1200x1500/png"];
  }, [p]);

  if (!p) return <main className="mx-auto max-w-6xl px-4 py-12">Loading…</main>;

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div className="overflow-hidden rounded-3xl border bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={p.title} className="h-full w-full object-cover" />
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{p.title}</h1>
        <div className="mt-2 text-lg text-neutral-700">{formatMoney(p.price_cents, p.currency)}</div>
        <p className="mt-5 text-sm text-neutral-600">{p.description}</p>

        <div className="mt-8 flex items-center gap-3">
          <div className="text-sm font-medium">Size</div>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            {(p.sizes || ["S", "M", "L", "XL"]).map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="ml-4 text-sm font-medium">Qty</div>
          <input
            type="number"
            value={qty}
            min={1}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="w-20 rounded-xl border px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => {
              addToCart({
                productId: p.id,
                slug: p.slug,
                title: p.title,
                cover: p.cover_image_url,
                priceCents: p.price_cents,
                currency: p.currency,
                size,
                qty,
              });
              router.push("/cart");
            }}
            className="rounded-2xl bg-black px-5 py-3 text-sm text-white"
          >
            Add to cart
          </button>

          <button
            onClick={() => router.push("/store")}
            className="rounded-2xl border px-5 py-3 text-sm"
          >
            Back to store
          </button>
        </div>
      </div>
    </main>
  );
}
