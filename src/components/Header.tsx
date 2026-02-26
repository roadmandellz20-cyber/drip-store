"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import CartDrawer from "./CartDrawer";
import { readCart } from "@/lib/cart";

type NavLink = { href: string; label: string };

const LINKS: NavLink[] = [
  { href: "/new", label: "NEW" },
  { href: "/limited", label: "LIMITED" },
  { href: "/store", label: "ALL PRODUCTS" },
];

function triggerClickGlitch(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("sv-click");
  void el.offsetWidth;
  el.classList.add("sv-click");
  window.setTimeout(() => el.classList.remove("sv-click"), 220);
}

function triggerCartAddGlitch(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("cart-add-glitch");
  void el.offsetWidth;
  el.classList.add("cart-add-glitch");
  window.setTimeout(() => el.classList.remove("cart-add-glitch"), 280);
}

export default function Header() {
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [count, setCount] = useState(0);
  const cartBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const sync = () => setCount(readCart().reduce((sum, item) => sum + item.qty, 0));
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("mugen_cart_update", sync);
    window.addEventListener("mugen:cart", sync);
    const onCartAdd = () => triggerCartAddGlitch(cartBtnRef.current);
    window.addEventListener("mugen:cart:add", onCartAdd as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mugen_cart_update", sync);
      window.removeEventListener("mugen:cart", sync);
      window.removeEventListener("mugen:cart:add", onCartAdd as EventListener);
    };
  }, []);

  const active = useMemo(() => {
    if (!pathname) return "";
    const match = LINKS.find((link) => pathname.startsWith(link.href));
    return match?.href ?? "";
  }, [pathname]);

  return (
    <>
      <div className="promo-bar">LIMITED DROP LIVE • Ships in 24–48h • No mass restocks</div>

      <header className="site-header">
        <Link className="brand" href="/archive" onClick={(e) => triggerClickGlitch(e.currentTarget)}>
          <span className="brand__name">MUGEN DISTRICT</span>
          <span className="brand__jp">無限</span>
        </Link>

        <nav className="nav" aria-label="Primary navigation">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              className={`nav__link ${active === link.href ? "is-active" : ""}`}
              href={link.href}
              onClick={(e) => triggerClickGlitch(e.currentTarget)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          <Link
            className="icon-link icon-link--navbox icon-link--search"
            href="/store#search"
            aria-label="Search"
            onClick={(e) => triggerClickGlitch(e.currentTarget)}
          >
            <span className="icon-link__glyph icon-link__glyph--search">⌕</span>
          </Link>

          <button
            className="icon-link icon-link--navbox icon-link--cart"
            ref={cartBtnRef}
            onClick={(e) => {
              triggerClickGlitch(e.currentTarget);
              setCartOpen(true);
            }}
            aria-label="Open cart"
            type="button"
          >
            🛒 <span className="cart-count">({count})</span>
          </button>

          <button
            className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
            onClick={(e) => {
              triggerClickGlitch(e.currentTarget);
              setMenuOpen((value) => !value);
            }}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`mobile-menu ${menuOpen ? "mobile-menu--open" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mobile-menu__top">
          <div className="mobile-menu__title">MENU</div>
          <button
            className="icon-link"
            type="button"
            aria-label="Close menu"
            onClick={(e) => {
              triggerClickGlitch(e.currentTarget);
              setMenuOpen(false);
            }}
          >
            ✕
          </button>
        </div>

        <div className="mobile-menu__links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="mobile-menu__link"
              onClick={(e) => {
                triggerClickGlitch(e.currentTarget);
                setMenuOpen(false);
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
