import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: products } = await supabaseServer
    .from("products")
    .select("id,title,slug,price_cents,currency,cover_image_url")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <main>
      {/* HERO */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <div className="text-sm text-neutral-600">From street to clean.</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              New drop. No excuses.
            </h1>
            <p className="mt-4 max-w-md text-neutral-600">
              Premium basics and statement pieces built for daily wear—simple, sharp, and ready.
            </p>

            <div className="mt-7 flex gap-3">
              <Link href="/store" className="rounded-2xl bg-black px-5 py-3 text-sm text-white">
                Shop now
              </Link>
              <Link href="/store?c=new" className="rounded-2xl border px-5 py-3 text-sm">
                New arrivals
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 text-xs text-neutral-600">
              <div className="rounded-2xl border p-4">
                <div className="font-medium text-black">Fast delivery</div>
                <div className="mt-1">Same-day in city</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="font-medium text-black">Easy returns</div>
                <div className="mt-1">7 days</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="font-medium text-black">Quality</div>
                <div className="mt-1">Built to last</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://placehold.co/1200x1200/png"
              alt="Lookbook"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* CATEGORY GRID */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Shop by category</h2>
            <p className="mt-2 text-sm text-neutral-600">Pick a lane. Or don’t.</p>
          </div>
          <Link href="/store" className="text-sm text-neutral-700 hover:text-black">
            View all
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { t: "New", c: "new" },
            { t: "Men", c: "men" },
            { t: "Women", c: "women" },
            { t: "Accessories", c: "accessories" },
          ].map((x) => (
            <Link
              key={x.c}
              href={`/store?c=${x.c}`}
              className="group relative overflow-hidden rounded-3xl border bg-neutral-100 p-6"
            >
              <div className="text-lg font-semibold">{x.t}</div>
              <div className="mt-2 text-sm text-neutral-600">Shop {x.t.toLowerCase()}</div>
              <div className="mt-10 h-24 w-full rounded-2xl bg-white/50" />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute inset-0 bg-black/5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="border-t bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
            <p className="mt-2 text-sm text-neutral-600">Best sellers + newest pieces.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(products || []).map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                title={p.title}
                cover={p.cover_image_url}
                priceCents={p.price_cents}
                currency={p.currency}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
