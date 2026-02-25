import { supabaseServer } from "@/lib/supabase-server";
import { ProductCard } from "@/components/ProductCard";

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;

  let q = supabaseServer
    .from("products")
    .select("id,title,slug,price_cents,currency,cover_image_url,collection_type,categories(slug)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const { data } = await q;

  const filtered = (data || []).filter((p: any) => (c ? p.categories?.slug === c : true));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Store</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {c ? `Category: ${c}` : "All products"}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((p: any) => (
          <ProductCard
            key={p.id}
            slug={p.slug}
            title={p.title}
            cover={p.cover_image_url}
            priceCents={p.price_cents}
            currency={p.currency}
            collectionType={p.collection_type}
          />
        ))}
      </div>
    </main>
  );
}
