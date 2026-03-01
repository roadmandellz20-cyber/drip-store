"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

type WaitlistModalProps = {
  open: boolean;
  onClose: () => void;
  source: "store" | "product";
  productSku?: string | null;
};

type WaitlistResponse = {
  ok?: boolean;
  error?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistModal({
  open,
  onClose,
  source,
  productSku = null,
}: WaitlistModalProps) {
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setContact("");
      setError("");
      setStatus("idle");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = contact.trim().toLowerCase();

    if (!EMAIL_RE.test(normalized)) {
      setError("Enter a valid email.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact: normalized,
          source,
          productSku,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as WaitlistResponse;

      if (!response.ok || !payload.ok) {
        setError(payload.error || "Archive link failed. Try again.");
        setStatus("idle");
        return;
      }

      window.dispatchEvent(
        new CustomEvent("mugen_toast", { detail: "You’re in. April 1 — don’t blink." })
      );
      onClose();
    } catch {
      setError("Archive link failed. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="waitlist" onClick={onClose}>
      <div
        className="waitlist__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="waitlist__top">
          <div>
            <div className="waitlist__eyebrow">DROP ALERT</div>
            <h2 id={titleId} className="waitlist__title">
              Join the archive
            </h2>
            <p id={descId} className="waitlist__copy">
              Early access. Password drops. Zero noise.
            </p>
          </div>

          <button className="waitlist__close" onClick={onClose} type="button" aria-label="Close drop alert">
            X
          </button>
        </div>

        <form className="waitlist__form" onSubmit={handleSubmit}>
          <label className="waitlist__label" htmlFor={inputId}>
            Email
          </label>
          <input
            id={inputId}
            className="waitlist__input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@domain.com"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            disabled={status === "loading"}
          />

          {error ? <div className="waitlist__error">{error}</div> : null}

          <div className="waitlist__actions">
            <button className="btn btn--primary" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "JOINING..." : "JOIN ARCHIVE"}
            </button>
            <button className="btn btn--ghost" type="button" onClick={onClose} disabled={status === "loading"}>
              KEEP WATCHING
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
