"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

function makeRef(orderId: string) {
  const token = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `MGN-${token || "00000000"}`;
}

function subscribeNoop() {
  return () => {};
}

type SuccessClientProps = {
  initialOrderId: string;
  initialOrderRef: string;
};

export default function SuccessClient({
  initialOrderId,
  initialOrderRef,
}: SuccessClientProps) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const lastOrderId = useSyncExternalStore(
    subscribeNoop,
    () => {
      try {
        return (localStorage.getItem("last_order_id") || "").trim();
      } catch {
        return "";
      }
    },
    () => ""
  );

  const orderId = initialOrderId || lastOrderId;
  const canShowMissingState = Boolean(initialOrderId) || hydrated;

  useEffect(() => {
    if (!initialOrderId) return;
    try {
      localStorage.setItem("last_order_id", initialOrderId);
    } catch {
      // Ignore localStorage write failures.
    }
  }, [initialOrderId]);

  const orderRef = useMemo(() => {
    if (initialOrderId && orderId === initialOrderId && initialOrderRef) {
      return initialOrderRef;
    }
    return orderId ? makeRef(orderId) : "";
  }, [initialOrderId, initialOrderRef, orderId]);

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
