import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">ORDER CANCELED</h1>
        <p className="page__sub">No order was placed. You can continue shopping anytime.</p>
      </div>
      <div className="checkout__side" style={{ maxWidth: 560 }}>
        <Link className="btn btn--primary" href="/store">
          RETURN TO STORE
        </Link>
        <Link className="btn btn--ghost" href="/archive">
          BACK TO ARCHIVE
        </Link>
      </div>
    </div>
  );
}
