"use client";

import { useEffect, useRef, useState } from "react";

export default function FxLayer() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // enable after mount (prevents SSR/CSR mismatch)
    setEnabled(true);

    const el = cursorRef.current;
    if (!el) return;

    let raf = 0;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // keep it visible + smooth
        el.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        el.style.opacity = "1";
      });
    };

    const onLeave = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div id="fx-noise" aria-hidden="true" />
      <div id="fx-scanlines" aria-hidden="true" />
      <div id="cursor-box" aria-hidden="true" ref={cursorRef} />
    </>
  );
}
