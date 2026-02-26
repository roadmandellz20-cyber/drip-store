import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="page__head">
            <h1 className="page__title">ORDER RECEIVED</h1>
            <p className="page__sub">Loading order reference...</p>
          </div>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
