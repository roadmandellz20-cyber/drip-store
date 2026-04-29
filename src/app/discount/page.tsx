import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "SPECIAL PRICING | MUGEN DISTRICT",
  description: "Exclusive access to limited-time discounts and rare archive pieces from Mugen District.",
  alternates: {
    canonical: "/discount",
  },
};

export default function DiscountPage() {
  return (
    <main className="page">
      <section className="page__head">
        <p className="page__kicker">EXCLUSIVE ACCESS</p>
        <h1 className="page__title">DISCOUNTS & ARCHIVE PIECES</h1>
        <p className="page__sub">
          Limited-time offers on select pieces from the Mugen District archive.
          <br />
          Use code DISTRICT15 for 15% off your next purchase.
        </p>

        <div className="page__actions">
          <Link href="/store" className="btn btn--primary">
            EXPLORE ARCHIVE
          </Link>
          <Link href="/about" className="btn btn--ghost">
            LEARN ABOUT MUGEN DISTRICT
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">ACTIVE DISCOUNT CODES</h2>
        <ul className="list">
          <li className="list__item">
            <span className="list__label">DISTRICT15</span>
            <span className="list__text">15% off all purchases</span>
          </li>
          <li className="list__item">
            <span className="list__label">ARCHIVE10</span>
            <span className="list__text">10% off select archive pieces</span>
          </li>
          <li className="list__item">
            <span className="list__label">LIMITEDTIME20</span>
            <span className="list__text">20% off limited-time offers (one-time use)</span>
          </li>
        </ul>
      </section>

      <section className="section">
        <h2 className="section__title">SELECTED ARCHIVE PIECES</h2>
        <ul className="list">
          <li className="list__item">
            <span className="list__label">GRID SHIRT</span>
            <span className="list__text">Rare grid print design, limited quantities available</span>
          </li>
          <li className="list__item">
            <span className="list__label">NOISE HOODIE</span>
            <span className="list__text">Exclusive noise pattern design, limited to 50 units</span>
          </li>
          <li className="list__item">
            <span className="list__label">LINE PANT</span>
            <span className="list__text">Limited-edition line pattern design, select sizes available</span>
          </li>
        </ul>
      </section>

      <section className="section">
        <h2 className="section__title">TERMS & CONDITIONS</h2>
        <p className="section__text">
          Discounts and promotions are subject to change without notice.
          <br />
          Limited to one use per customer, unless otherwise specified.
        </p>
      </section>
    </main>
  );
}