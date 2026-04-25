"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/admin/orders", label: "ORDERS" },
  { href: "/admin/products", label: "PRODUCTS" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (pathname === "/admin/login") return null;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="admin-hamburger"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-hamburger__bar" />
        <span className="admin-hamburger__bar" />
        <span className="admin-hamburger__bar" />
      </button>

      {/* Mobile overlay */}
      <div
        className={`admin-overlay${open ? " admin-overlay--active" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}>
        <div className="admin-sidebar__brand">
          <strong>MUGEN DISTRICT</strong>
          <span>ADMIN PANEL</span>
        </div>

        <nav className="admin-sidebar__nav">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`admin-sidebar__link${active ? " admin-sidebar__link--active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <Link href="/archive" className="admin-sidebar__back">
            ← SITE
          </Link>
        </div>
      </aside>
    </>
  );
}
