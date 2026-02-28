import Link from "next/link";

export const dynamic = "force-dynamic";

const IG_URL = "https://instagram.com/mugendistrict";
const WA_URL = "https://wa.me/2203340558";

export default function AboutPage() {
  return (
    <main className="page">
      <section className="page__head">
        <p className="page__kicker">THE ARCHIVE FILE</p>
        <h1 className="page__title">MUGEN DISTRICT</h1>
        <p className="page__sub">
          An underground archive built in The Gambia. Refined in Tokyo&apos;s noise.
          <br />
          Not merch. Art pieces you can wear.
        </p>

        <div className="page__actions">
          <Link href="/store" className="btn btn--primary">
            ENTER STORE
          </Link>
          <Link href={IG_URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            FOLLOW THE ARCHIVE
          </Link>
          <Link href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            WHATSAPP SUPPORT
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">THE ORIGIN</h2>
        <p className="section__text">
          Mugen District is a world you step into — a coded neighborhood of anime grit, street
          discipline, and design that doesn&apos;t beg for attention. Every piece is treated like a
          record in the archive: numbered, intentional, and released on our terms.
        </p>
        <p className="section__text">
          We don&apos;t chase &quot;drops&quot; for noise. We build chapters. Limited windows. Clean
          execution. No mass restocks.
        </p>
      </section>

      <section className="section">
        <h2 className="section__title">THE PIECES</h2>
        <ul className="list">
          <li className="list__item">
            <span className="list__label">LIMITED DROPS</span>
            <span className="list__text">Time-gated releases. When it closes, it closes.</span>
          </li>
          <li className="list__item">
            <span className="list__label">ARCHIVE PRINTS</span>
            <span className="list__text">Rare returns. Not guaranteed. Only when it makes sense.</span>
          </li>
          <li className="list__item">
            <span className="list__label">GRID STANDARDS</span>
            <span className="list__text">
              Fit, print, and detail rules. No sloppy work leaves the district.
            </span>
          </li>
        </ul>
      </section>

      <section className="section">
        <h2 className="section__title">DISTRICT RULES</h2>
        <ol className="rules">
          <li className="rules__item">Limited windows. No endless stock.</li>
          <li className="rules__item">Quiet confidence. The piece speaks.</li>
          <li className="rules__item">Quality over quantity — always.</li>
          <li className="rules__item">Every drop is a chapter, not a random print.</li>
          <li className="rules__item">You don&apos;t just buy — you enter.</li>
        </ol>

        <div className="divider" />

        <p className="section__text section__text--muted">ENTER THE MUGEN.</p>
      </section>

      <section className="section section--cta">
        <h2 className="section__title">READY?</h2>
        <p className="section__text">Follow the archive for drop dates and chapter releases.</p>
        <div className="page__actions">
          <Link href="/store" className="btn btn--primary">
            ENTER STORE
          </Link>
          <Link href={IG_URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            INSTAGRAM
          </Link>
          <Link href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            WHATSAPP
          </Link>
        </div>
      </section>
    </main>
  );
}
