import Link from "next/link";
import { formatMoney } from "@/lib/money";

type Props = {
  slug: string;
  title: string;
  cover: string;
  priceCents: number;
  currency: string;
};

export function ProductCard({ slug, title, cover, priceCents, currency }: Props) {
  return (
    <Link
      href={`/product/${slug}`}
      className="group overflow-hidden rounded-2xl border bg-white"
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover || "https://placehold.co/800x1000/png"}
          alt={title}
          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-4">
        <div className="line-clamp-1 text-sm font-medium">{title}</div>
        <div className="mt-1 text-sm text-neutral-600">{formatMoney(priceCents, currency)}</div>
      </div>
    </Link>
  );
}
