import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Mugen District.",
};

export default function PrivacyPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div className="page__kicker">MUGEN DISTRICT</div>
        <h1 className="page__title">PRIVACY POLICY</h1>
        <p className="page__sub">What we collect, why we collect it, and how we use it.</p>
      </div>

      <section className="panel">
        <div className="panel__line" />
        <div className="panel__body" style={{ display: "grid", gap: 20 }}>
          <div>
            <h2 className="page__kicker">Information We Collect</h2>
            <p className="muted">
              We collect the contact and shipping details you provide during checkout or newsletter signup,
              including your name, email address, phone number, delivery address, and order notes.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">How We Use It</h2>
            <p className="muted">
              We use your information to process orders, manage delivery, send order confirmations, answer
              support requests, and notify you about launches when you opt in.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Sharing</h2>
            <p className="muted">
              We only share your data with service providers required to run the store, such as payment,
              email, hosting, and shipping partners. We do not sell your personal information.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Retention</h2>
            <p className="muted">
              We keep order records and customer communications for operational, legal, and fraud-prevention
              purposes for as long as reasonably necessary.
            </p>
          </div>

          <div>
            <h2 className="page__kicker">Contact</h2>
            <p className="muted">
              For privacy questions or data requests, contact Mugen District through WhatsApp at
              {" "}
              <a href="https://wa.me/2203340558">+220 334 0558</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
