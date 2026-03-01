import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund policy for Mugen District.",
};

export default function RefundsPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div className="page__kicker">MUGEN DISTRICT</div>
        <h1 className="page__title">REFUND POLICY</h1>
        <p className="page__sub">Ground rules for cancellations, returns, and damaged orders.</p>
      </div>

      <section className="panel">
        <div className="panel__line" />
        <div className="panel__body" style={{ display: "grid", gap: 20 }}>
          <div>
            <h2 className="page__kicker">Before Fulfillment</h2>
            <p className="muted">
              Orders may be cancelled before they are confirmed for fulfillment. Once an order has been
              prepared or dispatched, cancellation is no longer guaranteed.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Returns</h2>
            <p className="muted">
              Returns are accepted only for items that arrive damaged, defective, or materially different from
              what was ordered. Contact us within 3 days of delivery with photos and your order reference.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Non-Returnable Items</h2>
            <p className="muted">
              Limited drops, worn items, washed items, and products damaged after delivery are not eligible
              for return or refund.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Refund Timing</h2>
            <p className="muted">
              Approved refunds are issued back through the original payment method or the agreed payment
              channel after the claim is reviewed.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Contact</h2>
            <p className="muted">
              Send refund or damage claims on WhatsApp to
              {" "}
              <a href="https://wa.me/2203340558">+220 334 0558</a>
              {" "}
              with your order reference and photos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
