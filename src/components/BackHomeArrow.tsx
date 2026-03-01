"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BackHomeArrow() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "/archive";

  if (isHome) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn--ghost back-home-arrow"
      aria-label="Go back"
      title="Go back"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push("/archive");
      }}
    >
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </button>
  );
}
