"use client";

export default function AddToCartButton({ slug }: { slug: string }) {
  const add = () => {
    try {
      const raw = localStorage.getItem("mugen_cart");
      const items = raw ? (JSON.parse(raw) as { slug: string; qty: number }[]) : [];
      const idx = items.findIndex((x) => x.slug === slug);
      if (idx >= 0) items[idx].qty += 1;
      else items.push({ slug, qty: 1 });
      localStorage.setItem("mugen_cart", JSON.stringify(items));
      window.dispatchEvent(new Event("mugen-cart"));
    } catch {}
  };

  return (
    <button
      onClick={add}
      className="mono border border-red-500/40 bg-black/40 px-5 py-3 text-xs tracking-[0.35em] text-red-200 hover:bg-black/60"
    >
      ADD TO CART
    </button>
  );
}
