import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";

type SuccessSearchParams = {
  order_id?: string | string[];
  order_ref?: string | string[];
};

type SuccessPageProps = {
  searchParams?: Promise<SuccessSearchParams> | SuccessSearchParams;
};

function pickParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : Array.isArray(value) ? value[0]?.trim() || "" : "";
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialOrderId = pickParam(resolvedSearchParams.order_id);
  const initialOrderRef = pickParam(resolvedSearchParams.order_ref);

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
      <SuccessClient initialOrderId={initialOrderId} initialOrderRef={initialOrderRef} />
    </Suspense>
  );
}
