"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CartDrawer from "./CartDrawer";
import { readCart } from "@/lib/cart";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readCart().reduce((s, i) => s + i.qty, 0));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("mugen_cart_update", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mugen_cart_update", sync as EventListener);
    };
  }, []);

  return (
    <>
      <div className="promo-bar">
        LIMITED DROP LIVE • Ships in 24–48h • No mass restocks
      </div>

      <header className="site-header">
        <Link className="brand" href="/archive">
          <span className="brand__name">MUGEN DISTRICT</span>
          <span className="brand__jp">無限</span>
        </Link>

        <nav className="nav">
          <Link href="/new">NEW</Link>
          <Link href="/limited">LIMITED</Link>
          <Link href="/store">ALL PRODUCTS</Link>
        </nav>

        <div className="nav-right">
          <Link className="nav-link" href="/store#search">
            Search
          </Link>

          <button className="cart-btn" onClick={() => setOpen(true)} aria-label="Open cart">
            Cart <span className="cart-count">({count})</span>
          </button>
        </div>
      </header>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
