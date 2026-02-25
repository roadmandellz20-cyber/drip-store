import Link from "next/link";
import { formatMoney } from "@/lib/money";

type Props = {
  slug: string;
  title: string;
  cover?: string | null;
  priceCents: number;
  currency: string;
  collectionType?: string | null;
};

export function ProductCard({ slug, title, cover, priceCents, currency, collectionType }: Props) {
  return (
    <Link
      href={`/product/${slug}`}
      className="group block rounded-2xl border border-zinc-200 bg-white p-2 transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg hover:shadow-black/10"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#0f1113] transition duration-300 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
        {collectionType === "limited" && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
            LIMITED
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover || "/placeholder.jpg"}
          alt={title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="space-y-1.5 px-1 pb-1 pt-3">
        <div className="line-clamp-1 text-sm font-bold tracking-tight text-zinc-950">{title}</div>
        <div className="text-sm text-zinc-500">{formatMoney(priceCents, currency)}</div>
      </div>
    </Link>
  );
}
