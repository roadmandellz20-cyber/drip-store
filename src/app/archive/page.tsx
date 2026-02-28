import Link from "next/link";
import LaunchCountdown from "@/components/LaunchCountdown";
import SocialLinks from "@/components/SocialLinks";
import ProductGrid from "@/components/ProductGrid";
import { ALL_PRODUCTS } from "@/lib/products";

export default function ArchivePage() {
  return (
    <div className="archive">
      <LaunchCountdown />

      <section className="hero hero-container" id="hero-section" role="banner">
        <div className="hero__bg" />
        <div className="hero__shade" />
        <div className="hero__torn" aria-hidden="true" />

        <div className="hero__inner">
          <div className="hero__kicker">URBAN TOKYO CHAOS</div>

          <h1 className="hero__title hero-title mugen-header" data-text="MUGEN DISTRICT">
            MUGEN <span>DISTRICT</span>
          </h1>

          <p className="hero__sub">
            Unlimited territory. An underground archive born in The Gambia, refined in the streets of Tokyo. Infinite energy—Zero limits.
          </p>

          <div className="hero__cta">
            <Link className="btn btn--ghost" href="/store">
              Enter Store →
            </Link>
            <Link className="btn btn--primary" href="/limited">
              View Limited →
            </Link>
          </div>

          <div className="hanko">
            <div className="hanko__stamp" aria-hidden="true">
              <span>無限</span>
            </div>
            <div className="hanko__meta">
              <div className="hanko__jp">無限地区</div>
              <div className="hanko__est">EST. 2026 // THE GAMBIA</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">MUGEN PRODUCT GRID</h2>
          <p className="section__note">Art pieces — not just shirts. Hover to swap to lookbook.</p>
        </div>

        <ProductGrid products={ALL_PRODUCTS} />
      </section>

      <section className="ticker">
        <div className="ticker__label">ARCHIVE FEED</div>
        <div className="ticker__track">
          <div className="ticker__row">
            ウルキオラ / ULQUIORRA　　黒崎一護 / ICHIGO　　無限地区 / MUGEN DISTRICT　　限定 / LIMITED DROP　　発送 / SHIPS 24–48H　　再入荷なし / NO RESTOCK
          </div>
          <div className="ticker__row ticker__row--alt">
            ルフィ / LUFFY　　黒崎一護 / ICHIGO　　ウルキオラ / ULQUIORRA　　無限地区 / MUGEN DISTRICT　　限定 / LIMITED DROP　　発送 / SHIPS 24–48H　　再入荷なし / NO RESTOCK
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__grid">
          <div className="footer__card">
            <div className="footer__title">MANIFESTO</div>
            <p>{"Mugen District is the intersection of West African grit and Neo-Tokyo aesthetics. We don't just drop clothes; we archive movements. Established 2026. From the coast of Gambia to the heart of Shibuya."}</p>
            <SocialLinks variant="footer" className="mt-4" />
            <div className="footer__small">DISCARDED TOKYO NEWSPAPER • ISSUE 001</div>
          </div>

          <div className="footer__card">
            <div className="footer__title">LINKS</div>
            <div className="footer__links">
              <Link href="/store">All Products</Link>
              <Link href="/new">New</Link>
              <Link href="/limited">Limited</Link>
            </div>
          </div>

          <div className="footer__card">
            <div className="footer__title">NEWSLETTER</div>
            <p>Get drops first. No spam.</p>
            <form className="newsletter">
              <input className="newsletter__input" placeholder="Email" />
              <button className="btn btn--primary" type="submit">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="footer__bottom">© 2026 MUGEN DISTRICT</div>
      </footer>
    </div>
  );
}
