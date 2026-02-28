import Link from "next/link";

const WA_URL = "https://wa.me/2203340558";

export default function FloatingWhatsApp() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-black/70 px-4 py-3 text-xs tracking-widest uppercase text-white/90 shadow-lg backdrop-blur hover:border-white/40 hover:bg-black/85 transition"
        aria-label="WhatsApp Mugen District"
      >
        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/75 group-hover:text-white/90 transition">
          WA
        </span>
        <span>WhatsApp</span>
        <span className="hidden sm:inline text-white/60 group-hover:text-white/80 transition">
          Fast support
        </span>
      </Link>
    </div>
  );
}
