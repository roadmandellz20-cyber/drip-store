"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart } from "@/lib/cart";

const nav = [
  { label: "New", href: "/store?c=new" },
  { label: "Men", href: "/store?c=men" },
  { label: "Women", href: "/store?c=women" },
  { label: "Accessories", href: "/store?c=accessories" },
  { label: "Sale", href: "/store?c=sale" },
  { label: "All Products", href: "/store" },
];

export function Header() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(getCart().reduce((n, x) => n + x.qty, 0));
    refresh();
    window.addEventListener("storage", refresh);
    const i = setInterval(refresh, 600);
    return () => {
      window.removeEventListener("storage", refresh);
      clearInterval(i);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight">
              MUGEN DISTRICT
            </span>
            <span className="text-[10px] text-zinc-500 tracking-widest">
              無限
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          {nav.map((x) => (
            <Link key={x.href} href={x.href} className="text-sm text-neutral-700 hover:text-black">
              {x.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/store" className="text-sm text-neutral-700 hover:text-black">
            Search
          </Link>
          <Link href="/cart" className="text-sm font-medium">
            Cart <span className="text-neutral-500">({count})</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
