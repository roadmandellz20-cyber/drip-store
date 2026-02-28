"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Props = {
  initialOrderId: string;
  initialOrderRef: string;
};

const BUSINESS_WA_NUMBER = "2203340558";
const BUSINESS_TEL = "+2203340558";

function clampStr(value: string, max = 120) {
  const v = (value || "").trim();
  if (!v) return "";
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

function buildLuxuryMessage(params: {
  orderRef: string;
  orderId?: string;
}) {
  const orderRef = params.orderRef || "";
  const orderId = params.orderId || "";
  const lines = [
    "ENTER THE MUGEN.",
    "",
    "Hey Mugen District — I just placed an order.",
    "",
    `Order Locked: ${orderRef || "MGN-—"}`,
    `Order ID: ${orderId || "—"}`,
    "",
    "Looking forward to the next steps.",
  ].filter(Boolean);

  return lines.join("\n");
}

function waUrl(phoneNoPlus: string, message: string) {
  return `https://wa.me/${phoneNoPlus}?text=${encodeURIComponent(message)}`;
}

export default function SuccessClient({ initialOrderId, initialOrderRef }: Props) {
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);

  const orderId = initialOrderId;
  const orderRef = useMemo(() => {
    if (initialOrderRef) return initialOrderRef;
    if (!initialOrderId) return "";

    const token = initialOrderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    return `MGN-${token || "00000000"}`;
  }, [initialOrderId, initialOrderRef]);

  const message = useMemo(
    () => buildLuxuryMessage({ orderRef, orderId }),
    [orderRef, orderId]
  );

  const whatsappLink = useMemo(
    () => waUrl(BUSINESS_WA_NUMBER, message),
    [message]
  );

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setFlash(true);
      window.dispatchEvent(new CustomEvent("mugen_toast", { detail: "Copied" }));
      window.setTimeout(() => setCopied(false), 1800);
      window.setTimeout(() => setFlash(false), 160);
    } catch {
      setCopied(false);
    }
  }

  function openWhatsApp() {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`page ${flash ? "page--flash" : ""}`}>
      <div className="page__head">
        <div className="page__kicker">MUGEN DISTRICT // ARCHIVE ENTRY</div>
        <h1 className="page__title">
          ORDER <span className="glitch" data-text="ARCHIVED">ARCHIVED</span>
        </h1>
        <p className="page__sub">
          Unlimited territory. Your order is logged.
          <br />
          <span className="muted">Manual payment — we’ll reach out to complete delivery.</span>
        </p>
      </div>

      <div className="panel">
        <div className="panel__line" />
        <div className="panel__body">
          <div className="mono mono--big">
            REF: <span className="mono__strong">{clampStr(orderRef || "MGN-—", 40)}</span>
          </div>

          <div className="muted">
            Keep this reference. If you want instant confirmation, hit WhatsApp.
          </div>

          <div className="actions">
            <button className="btn btn--primary" onClick={openWhatsApp} type="button">
              CONFIRM ON WHATSAPP
              <span className="btn__hint">/ instant line</span>
            </button>

            <button className="btn btn--secondary" onClick={copyDetails} type="button">
              {copied ? "COPIED." : "COPY ORDER DETAILS"}
              <span className="btn__hint">/ paste anywhere</span>
            </button>

            <a className="btn btn--ghost btn--mobile" href={`tel:${BUSINESS_TEL}`}>
              CALL TO CONFIRM
              <span className="btn__hint">/ mobile</span>
            </a>
          </div>

          <div className="mini">
            <div className="mini__label">NEXT</div>
            <div className="mini__text">
              We’ll message you with payment + delivery options.
              <br />
              <span className="muted">ENTER THE MUGEN.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footerlinks">
        <Link className="footerlinks__a" href="/archive">
          BACK TO ARCHIVE
        </Link>
        <span className="footerlinks__sep">/</span>
        <Link className="footerlinks__a" href="/store">
          VIEW ALL PRODUCTS
        </Link>
      </div>

      <pre className="rawmsg" aria-label="Order message">
        {message}
      </pre>
    </div>
  );
}
