"use client";

import { useEffect } from "react";

export default function ToastClient() {
  useEffect(() => {
    const host = document.getElementById("toast");
    if (!host) return;

    const onToast = (e: Event) => {
      const msg = (e as CustomEvent).detail || "Done.";
      const el = document.createElement("div");
      el.className = "toast";
      el.textContent = String(msg);
      host.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    };

    window.addEventListener("mugen_toast", onToast as EventListener);
    return () => window.removeEventListener("mugen_toast", onToast as EventListener);
  }, []);

  return null;
}
