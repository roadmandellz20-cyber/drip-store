"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BackHomeArrow() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "/archive";

  if (isHome) {
    return null;
  }

  return (
    <Link
      className="btn btn--ghost back-home-arrow"
      href="/archive"
      aria-label="Back to home"
      title="Back to home"
    >
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </Link>
  );
}
