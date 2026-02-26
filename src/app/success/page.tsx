"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function makeRef(orderId: string) {
  const token = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `MGN-${token || "00000000"}`;
}

export default function SuccessPage() {
  const router = useRouter();
  const params = useSearchParams();

  const urlOrderId = (params.get("order_id") || "").trim();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const lastOrderId = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return (localStorage.getItem("last_order_id") || "").trim();
      } catch {
        return "";
      }
    },
    () => ""
  );
  const orderId = urlOrderId || lastOrderId;
  const canShowMissingState = Boolean(urlOrderId) || hydrated;

  useEffect(() => {
    if (urlOrderId) {
      try {
        localStorage.setItem("last_order_id", urlOrderId);
      } catch {
        // Ignore localStorage write failures.
      }
    }
  }, [urlOrderId]);

  const orderRef = useMemo(() => (orderId ? makeRef(orderId) : ""), [orderId]);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">ORDER RECEIVED</h1>
        {orderId ? (
          <>
            <p className="page__sub">
              Order reference: <strong>{orderRef}</strong>
            </p>
            <p className="page__sub">You will be contacted shortly to complete payment.</p>
          </>
        ) : !canShowMissingState ? (
          <p className="page__sub">Checking order reference...</p>
        ) : (
          <>
            <p className="page__sub">We could not find your order reference in this link.</p>
            <p className="page__sub">Go back to checkout and try again.</p>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn--ghost" onClick={() => router.push("/checkout")} type="button">
          BACK TO CHECKOUT
        </button>
        <button className="btn btn--ghost" onClick={() => router.push("/archive")} type="button">
          BACK TO ARCHIVE
        </button>
      </div>
    </div>
  );
}
