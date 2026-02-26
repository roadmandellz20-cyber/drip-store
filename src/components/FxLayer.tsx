"use client";

import { useEffect, useRef } from "react";

export default function FxLayer() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickable = target.closest("button, .btn, .icon-link");
      if (!(clickable instanceof HTMLElement)) return;

      clickable.classList.remove("btn-glitch");
      void clickable.offsetWidth;
      clickable.classList.add("btn-glitch");
      window.setTimeout(() => clickable.classList.remove("btn-glitch"), 220);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <>
      <div id="fx-noise" aria-hidden="true" />
      <div id="fx-scanlines" aria-hidden="true" />
      <div id="cursor-box" aria-hidden="true" ref={cursorRef} />
    </>
  );
}
