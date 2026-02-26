export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="border border-white/10 p-5">
            <div className="text-sm font-semibold tracking-[0.2em]">MANIFESTO</div>
            <p className="mt-3 text-sm font-normal text-white/70 leading-relaxed">
              {"Mugen District is the intersection of West African grit and Neo-Tokyo aesthetics. We don't just drop clothes; we archive movements. Established 2026. From the coast of Gambia to the heart of Shibuya."}
            </p>
            <div className="mt-4 space-y-2 text-sm font-normal tracking-[0.12em] text-white">
              <a className="block hover:text-white/80" href="#">INSTAGRAM</a>
              <a className="block hover:text-white/80" href="#">TIKTOK</a>
              <a className="block hover:text-white/80" href="#">X</a>
            </div>
            <div className="mt-4 text-xs tracking-[0.2em] text-white/60">
              DISCARDED TOKYO NEWSPAPER • ISSUE 001
            </div>
          </div>

          <div className="border border-white/10 p-5">
            <div className="text-sm font-semibold tracking-[0.2em]">LINKS</div>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <a className="block hover:text-white" href="/store">Store</a>
              <a className="block hover:text-white" href="/checkout">Checkout</a>
              <a className="block hover:text-white" href="/archive#grid">Product Grid</a>
            </div>
          </div>

          <div className="border border-white/10 p-5">
            <div className="text-sm font-semibold tracking-[0.2em]">NEWSLETTER</div>
            <p className="mt-3 text-sm text-white/70">Get drops first. No spam.</p>
            <div className="mt-3 flex gap-2">
              <input
                className="w-full border border-white/15 bg-black px-3 py-2 text-sm outline-none"
                placeholder="Email"
              />
              <button className="border border-white/40 bg-white px-4 py-2 text-sm text-black hover:bg-white/90">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-white/50">
          © {new Date().getFullYear()} MUGEN DISTRICT
        </div>
      </div>
    </footer>
  );
}
