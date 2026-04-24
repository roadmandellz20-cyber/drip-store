"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();

  if (pathname === "/admin/login") return null;

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        borderBottom: "1px solid var(--line)",
        background: "rgba(0,0,0,.6)",
        backdropFilter: "blur(8px)",
        padding: "0 18px",
        height: "42px",
        fontFamily: "var(--mono)",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          letterSpacing: ".2em",
          color: "rgba(255,255,255,.3)",
          textTransform: "uppercase",
          marginRight: "20px",
          userSelect: "none",
        }}
      >
        ADMIN
      </span>
      <div style={{ display: "flex", gap: "0" }}>
        {[
          { href: "/admin/orders", label: "ORDERS" },
          { href: "/admin/products", label: "PRODUCTS" },
        ].map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "inline-block",
                padding: "0 14px",
                height: "42px",
                lineHeight: "42px",
                fontSize: "11px",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: active ? "#fff" : "rgba(255,255,255,.5)",
                borderBottom: active ? "2px solid #fff" : "2px solid transparent",
                fontWeight: 700,
                transition: "color .15s, border-color .15s",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
