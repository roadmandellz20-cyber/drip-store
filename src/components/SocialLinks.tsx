import Link from "next/link";

const IG_URL =
  "https://www.instagram.com/mugendistrict?igsh=MjV5b2xic2d0cmY1&utm_source=qr";
const WA_URL = "https://wa.me/2203340558";

type Props = {
  variant?: "header" | "footer";
  className?: string;
};

export default function SocialLinks({ variant = "header", className = "" }: Props) {
  const base =
    "inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs tracking-widest uppercase text-white/90 hover:border-white/35 hover:text-white transition";

  const btn = variant === "footer" ? "social-link--footer" : base;
  const wrapper =
    variant === "footer"
      ? `social-links social-links--footer ${className}`.trim()
      : `flex items-center gap-2 ${className}`.trim();

  return (
    <div className={wrapper}>
      <Link
        href={IG_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        aria-label="Mugen District on Instagram"
        title="Follow the archive"
      >
        {variant === "footer" ? (
          "INSTAGRAM"
        ) : (
          <>
            <span className="opacity-80">IG</span>
            <span className="hidden sm:inline">Instagram</span>
          </>
        )}
      </Link>

      <Link
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        aria-label="Message Mugen District on WhatsApp"
        title="Order support"
      >
        {variant === "footer" ? (
          "WHATSAPP.SUPPORT"
        ) : (
          <>
            <span className="opacity-80">WA</span>
            <span className="hidden sm:inline">WhatsApp</span>
          </>
        )}
      </Link>
    </div>
  );
}
