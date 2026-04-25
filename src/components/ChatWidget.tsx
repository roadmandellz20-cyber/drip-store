"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const WELCOME: ChatMessage = {
  role: "assistant",
  content: "ENTER THE MUGEN. Ask me anything about the drop.",
};

const WHATSAPP_FALLBACK = "Hit us on WhatsApp for help: https://wa.me/2203340558";

function renderContent(text: string) {
  // Make bare https:// URLs clickable
  const urlRe = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRe);
  return parts.map((part, i) =>
    urlRe.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    )
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  ).current;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Suppress on all /admin/* pages — after hooks so rules-of-hooks is satisfied
  // Guard against null (usePathname() can return null before router initializes)
  if (!pathname || pathname.startsWith("/admin")) return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Exclude the static welcome message from API history
          messages: next.slice(1),
          sessionId,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { reply?: string };
      const reply = data.reply?.trim() || WHATSAPP_FALLBACK;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: WHATSAPP_FALLBACK }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="chat-win" role="dialog" aria-label="Mugen District chat">
          {/* Header */}
          <div className="chat-win__head">
            <p className="chat-win__title">MUGEN DISTRICT</p>
            <button
              className="chat-win__close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="chat-win__msgs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={msg.role === "user" ? "chat-msg--user" : "chat-msg--bot"}
              >
                {renderContent(msg.content)}
              </div>
            ))}

            {loading && (
              <div className="chat-msg--bot">
                <div className="chat-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-win__input-row">
            <textarea
              ref={inputRef}
              className="chat-win__field"
              rows={1}
              placeholder="Ask about the drop..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              aria-label="Chat message"
            />
            <button
              className="chat-win__send"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              SEND
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        className="chat-btn"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <line x1="4" y1="4" x2="16" y2="16" stroke="white" strokeWidth="1.5" />
            <line x1="16" y1="4" x2="4" y2="16" stroke="white" strokeWidth="1.5" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path
              d="M4 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z"
              stroke="white"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
