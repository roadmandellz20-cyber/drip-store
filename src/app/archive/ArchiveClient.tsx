"use client";

import { useEffect, useMemo } from "react";

type Product = {
  code: string;
  title: string;
  status: "LIMITED" | "AVAILABLE";
  img: string;
  look: string;
  tag?: string;
};

export default function ArchiveClient() {
  const products: Product[] = useMemo(
    () => [
      {
        code: "LUFFY-01",
        title: "Luffy Chaos Print",
        status: "LIMITED",
        img: "/archive/assets/luffy-01.jpg",
        look: "/archive/assets/luffy-02.jpg",
        tag: "Gear 5 Drop",
      },
      {
        code: "ICHIGO-01",
        title: "Ichigo Hollow Grunge",
        status: "AVAILABLE",
        img: "/archive/assets/ichigo-01.jpg",
        look: "/archive/assets/ichigo-02.jpg",
        tag: "Archive Print",
      },
      {
        code: "ULQ-01",
        title: "Ulquiorra Segunda Etapa",
        status: "LIMITED",
        img: "/archive/assets/ulquiorra-01.jpg",
        look: "/archive/assets/ulquiorra-01.jpg",
        tag: "Night Drop",
      },
      // If you add more later, extend here
    ],
    []
  );

  useEffect(() => {
    const root = document.documentElement;

    // Cursor overlay (do NOT hide real cursor)
    const cursor = document.querySelector<HTMLDivElement>("[data-md-cursor]");
    const onMove = (e: MouseEvent) => {
      if (!cursor) return;
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // Parallax hero background shift
    const onScroll = () => {
      const y = window.scrollY || 0;
      root.style.setProperty("--md-scroll", String(y));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Scroll reveal “slam”
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));

    // Ticker duplication
    const ticker = document.querySelector<HTMLElement>("[data-ticker]");
    if (ticker) {
      const inner = ticker.querySelector<HTMLElement>("[data-ticker-inner]");
      if (inner) {
        const clone = inner.cloneNode(true) as HTMLElement;
        clone.setAttribute("aria-hidden", "true");
        ticker.appendChild(clone);
      }
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <>
      {/* overlays */}
      <div className="md-noise" aria-hidden="true" />
      <div className="md-scanlines" aria-hidden="true" />
      <div className="md-vignette" aria-hidden="true" />
      <div className="md-cursor" data-md-cursor aria-hidden="true" />

      {/* HERO */}
      <section className="md-hero" aria-label="Hero">
        <div className="md-heroBg" aria-hidden="true" />
        <div className="md-heroTear md-heroTearTop" aria-hidden="true" />
        <div className="md-heroTear md-heroTearBottom" aria-hidden="true" />

        <header className="md-heroContent" data-reveal>
          <div className="md-kicker">URBAN TOKYO CHAOS</div>

          <h1 className="md-title">
            <span className="md-titleMain">MUGEN</span>{" "}
            <span className="md-titleAlt">DISTRICT</span>
          </h1>

          <div className="md-sub">
            90s scanlations. DIY punk zines. Shibuya back-alley grit.
          </div>

          <div className="md-ctaRow">
            <a className="md-btn md-btnPrimary" href="#grid">
              ENTER ARCHIVE
            </a>
            <a className="md-btn md-btnGhost" href="/store">
              GO TO STORE
            </a>
          </div>

          <div className="md-seal" aria-label="Hanko Seal">
            <div className="md-sealInner">
              <div className="md-sealKanji">無限</div>
              <div className="md-sealLabel">HANKO</div>
            </div>
          </div>
        </header>
      </section>

      {/* PRODUCT GRID */}
      <section className="md-gridWrap" id="grid" aria-label="Mugen Grid">
        <div className="md-sectionHead" data-reveal>
          <h2 className="md-h2 glitchText" data-glitch="MUGEN PRODUCT GRID">
            MUGEN PRODUCT GRID
          </h2>
          <p className="md-muted">
            Art pieces — not just shirts. Hover to swap to lookbook.
          </p>
        </div>

        <div className="md-grid" data-reveal>
          {products.map((p, idx) => (
            <article
              key={p.code}
              className={`md-card ${p.status === "LIMITED" ? "is-limited" : "is-available"} md-pos-${idx + 1}`}
            >
              <div className="md-badgeRow">
                <span className={`md-badge ${p.status === "LIMITED" ? "md-badgeLimited" : "md-badgeAvail"}`}>
                  {p.status}
                </span>
                {p.tag ? <span className="md-micro">{p.tag}</span> : null}
              </div>

              <figure className="md-figure">
                <img className="md-img md-imgBase" src={p.img} alt={p.title} />
                <img className="md-img md-imgLook" src={p.look} alt={`${p.title} look`} />
                <div className="md-glitchOverlay" aria-hidden="true" />
              </figure>

              <div className="md-cardMeta">
                <div className="md-code">{p.code}</div>
                <div className="md-name">{p.title}</div>

                <div className="md-actions">
                  <button className="md-copBtn" type="button">
                    <span className="md-copText">COP</span>
                    <span className="md-copText md-copTextGhost">COP</span>
                  </button>

                  <a className="md-link" href="/store">
                    view store →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ARCHIVE TICKER */}
      <section className="md-tickerWrap" aria-label="Archive Ticker" data-reveal>
        <div className="md-tickerTitle">ARCHIVE FEED</div>
        <div className="md-ticker" data-ticker>
          <div className="md-tickerInner" data-ticker-inner>
            <span>ルフィ / LUFFY</span>
            <span>一護 / ICHIGO</span>
            <span>ウルキオラ / ULQUIORRA</span>
            <span>無限地区 / MUGEN DISTRICT</span>
            <span>限定 / LIMITED DROP</span>
            <span>発送 / SHIPS 24–48H</span>
            <span>再入荷なし / NO RESTOCK</span>
          </div>
        </div>
      </section>

      {/* FOOTER MANIFESTO */}
      <footer className="md-footer" aria-label="Footer">
        <div className="md-footerGrid" data-reveal>
          <div className="md-paperBlock">
            <div className="md-paperHead">MANIFESTO</div>
            <p>
              From street to clean — but never safe.
              <br />
              This is controlled chaos: hard edges, raw texture, loud presence.
            </p>
            <p className="md-stamp">DISCARDED TOKYO NEWSPAPER • ISSUE 001</p>
          </div>

          <div className="md-paperBlock">
            <div className="md-paperHead">LINKS</div>
            <div className="md-links">
              <a href="/store">Store</a>
              <a href="/checkout">Checkout</a>
              <a href="#grid">Product Grid</a>
            </div>
            <div className="md-links md-links2">
              <a href="#" aria-disabled="true">
                Instagram
              </a>
              <a href="#" aria-disabled="true">
                TikTok
              </a>
              <a href="#" aria-disabled="true">
                X
              </a>
            </div>
          </div>

          <div className="md-paperBlock">
            <div className="md-paperHead">NEWSLETTER</div>
            <p>Get drops first. No spam.</p>
            <form className="md-form" onSubmit={(e) => e.preventDefault()}>
              <input className="md-input" placeholder="Email" />
              <button className="md-join" type="submit">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="md-copy">© 2026 MUGEN DISTRICT</div>
      </footer>
    </>
  );
}