"use client";

import { FormEvent, useState } from "react";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      setStatus("error");
      setMessage("That email looks corrupted. Try again.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalized }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || "Newsletter signup failed.");
      }

      setEmail("");
      setStatus("success");
      setMessage(data.message || "You're in.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "That email looks corrupted. Try again."
      );
    }
  }

  return (
    <form className="newsletter" onSubmit={onSubmit}>
      <div className="newsletter__eyebrow">DROP SIGNAL</div>
      <p className="newsletter__copy">Early access. Password drops. Zero noise.</p>
      <div className="newsletter__controls">
        <input
          className="newsletter__input"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          aria-label="Email address"
          disabled={status === "loading"}
        />
        <button className="btn btn--primary" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "SENDING..." : "GET ACCESS →"}
        </button>
      </div>
      {message ? (
        <div className={`newsletter__message newsletter__message--${status}`}>
          {message}
        </div>
      ) : null}
    </form>
  );
}
