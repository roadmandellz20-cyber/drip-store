"use client";

import { usePathname } from "next/navigation";
import SocialLinks from "./SocialLinks";

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/archive") {
    return null;
  }

  return (
    <footer className="border-t border-white/10 bg-black">
      <div
        className="mx-auto max-w-[760px] py-10"
        style={{ paddingLeft: 16, paddingRight: 16 }}
      >
        <div
          className="border border-white/10 bg-black/40"
          style={{ padding: "24px 28px" }}
        >
          <div style={{ paddingLeft: 18, paddingRight: 18 }}>
            <div className="text-sm font-semibold tracking-[0.2em] text-white">MANIFESTO</div>
            <p className="mt-3 text-sm font-normal leading-relaxed text-white/70">
              {"Mugen District is the intersection of West African grit and Neo-Tokyo aesthetics. We don't just drop clothes; we archive movements. Established 2026. From the coast of Gambia to the heart of Shibuya."}
            </p>

            <div className="mt-6">
              <SocialLinks variant="footer" />
              <div className="mt-4 text-xs tracking-[0.2em] text-white/60">
                © MUGEN DISTRICT — ENTER THE MUGEN.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
