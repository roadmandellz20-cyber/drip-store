import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Mugen District.",
};

export default function TermsPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div className="page__kicker">MUGEN DISTRICT</div>
        <h1 className="page__title">TERMS OF SERVICE</h1>
        <p className="page__sub">The rules that govern use of the store and purchase flow.</p>
      </div>

      <section className="panel">
        <div className="panel__line" />
        <div className="panel__body" style={{ display: "grid", gap: 20 }}>
          <div>
            <h2 className="page__kicker">Orders</h2>
            <p className="muted">
              By placing an order, you agree that all shipping and contact details provided are accurate and
              complete. We reserve the right to cancel or refuse orders that appear fraudulent or incomplete.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Pricing And Availability</h2>
            <p className="muted">
              Product availability, pricing, and limited stock counts may change without notice. A product is
              not guaranteed until the order is accepted and confirmed.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Manual Payment Flow</h2>
            <p className="muted">
              Orders submitted through the current checkout flow may require manual confirmation before payment
              and dispatch are completed. Submission of an order request does not by itself guarantee
              fulfillment.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Intellectual Property</h2>
            <p className="muted">
              All Mugen District branding, graphics, styling, and site content are protected and may not be
              reused without permission.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Contact</h2>
            <p className="muted">
              Questions about these terms can be sent through WhatsApp at
              {" "}
              <a href="https://wa.me/2203340558">+220 334 0558</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
