import Link from "next/link";
import type { Metadata } from "next";
import ArchiveFeedTicker from "@/components/ArchiveFeedTicker";
import LaunchCountdown from "@/components/LaunchCountdown";
import NewsletterSignup from "@/components/NewsletterSignup";
import SocialLinks from "@/components/SocialLinks";
import ProductGrid from "@/components/ProductGrid";
import { fetchProductsWithInventory } from "@/lib/products-server";
import { absoluteUrl, SITE_OG_IMAGE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Archive",
  description: "Enter the archive. Limited drops, no restocks, and the full Mugen District product grid.",
  alternates: {
    canonical: "/archive",
  },
  openGraph: {
    title: "MUGEN DISTRICT",
    description: "Enter the archive. Limited drops, no restocks, and the full Mugen District product grid.",
    url: absoluteUrl("/archive"),
    images: [
      {
        url: absoluteUrl(SITE_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: "Mugen District Archive",
      },
    ],
  },
};

export default async function ArchivePage() {
  const products = await fetchProductsWithInventory();

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

        <ProductGrid products={products} />
      </section>

      <ArchiveFeedTicker />

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
            <NewsletterSignup />
          </div>
        </div>

        <div className="footer__bottom">© 2026 MUGEN DISTRICT</div>
      </footer>
    </div>
  );
}
