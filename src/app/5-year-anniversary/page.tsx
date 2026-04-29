import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "5 Year Anniversary | MUGEN DISTRICT",
  description: "Celebrating five years of Mugen District with a 48-hour return of limited archive pieces.",
  alternates: {
    canonical: "/5-year-anniversary",
  },
};

export default function FiveYearAnniversaryPage() {
  return (
    <main className="page">
      <section className="page__head">
        <p className="page__kicker">LIMITED ARCHIVE RETURN</p>
        <h1 className="page__title">5 YEAR ANNIVERSARY</h1>
        <p className="page__sub">
          For 48 hours only, we're bringing back a selection of our most coveted archive pieces.
          <br />
          Limited quantities available.
        </p>

        <div className="section">
          <h2 className="section__title">RETURNING LIMITED TEES</h2>
          <ul className="list">
            <li className="list__item">
              <span className="list__label">VORTEX TEE</span>
              <span className="list__text">First released in 2019, this tee is a true archive classic.</span>
            </li>
            <li className="list__item">
              <span className="list__label">KAIJU TEE</span>
              <span className="list__text">Originally sold out in 2020, this limited tee is back for a short time.</span>
            </li>
            <li className="list__item">
              <span className="list__label">NOISE TEE</span>
              <span className="list__text">Our most experimental design to date, now available again.</span>
            </li>
          </ul>
        </div>

        <div className="section">
          <h2 className="section__title">COUNTDOWN TIMER</h2>
          <p className="section__text">
            Don't miss your chance to own a piece of Mugen District history. The countdown begins now:
            <br />
            <span id="countdown-timer">48:00:00</span>
          </p>
        </div>

        <div className="page__actions">
          <Link href="/store" className="btn btn--primary">
            SHOP LIMITED ARCHIVE
          </Link>
        </div>
      </section>
    </main>
  );
}