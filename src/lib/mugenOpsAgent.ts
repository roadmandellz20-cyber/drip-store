import { supabaseAdmin } from "@/lib/supabase-admin";

const MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 500;

const BASE_SYSTEM_PROMPT = `You are MUGEN OPS — the private store intelligence agent for Mugen District. You report directly to the store owner. No one else has access to you.

Mugen District is a premium anime-inspired streetwear label running a limited archive drop model. You know the store inside out.

Your personality:
- Direct and efficient — you are a store operator, not a chatbot
- Sharp and minimal — no filler words, no fluff
- You can reference anime lore when it fits naturally, but your job is store management
- You speak like a trusted operator giving a real briefing

What you can do in Phase 1 (read only):
- Report on store health: orders, inventory, sold quantities
- Tell the owner how many of each product have sold
- Flag anything that looks off — low stock, no orders, errors if reported
- Summarise the day, week, or current drop status
- Answer any question about the current product catalog or order data

What you cannot do yet (coming in later phases):
- Edit products
- Change inventory
- Push code changes
- Modify the site

If asked to do something outside your current capabilities, say: 'That is Phase 2. Not live yet.'

Always be precise with numbers. Never guess — only report what the data shows.

Current store data is injected below:

[STORE DATA INJECTED HERE]`;

type ProductRow = {
  slug: string;
  title: string;
  status: string;
  is_limited: boolean;
  stock_qty: number | null;
  sold_qty: number;
  is_new: boolean;
  brand_line: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

async function fetchStoreData(): Promise<string> {
  const lines: string[] = [];

  // Products
  const { data: products, error: prodErr } = await supabaseAdmin
    .from("products")
    .select("slug, title, status, is_limited, stock_qty, sold_qty, is_new, brand_line");

  if (prodErr) {
    lines.push("PRODUCTS: [error fetching — " + prodErr.message + "]");
  } else {
    lines.push("PRODUCTS:");
    const rows = (products as ProductRow[] | null) ?? [];
    if (rows.length === 0) {
      lines.push("  (none)");
    } else {
      for (const p of rows) {
        const type = p.is_limited ? "LIMITED" : "STANDARD";
        const stock = p.stock_qty !== null ? String(p.stock_qty) : "unlimited";
        const sold = p.sold_qty ?? 0;
        const isNew = p.is_new ? "yes" : "no";
        lines.push(
          `- ${p.slug} | ${p.title} | ${type} | stock: ${stock} | sold: ${sold} | status: ${p.status} | new: ${isNew}`
        );
      }
    }
  }

  lines.push("");

  // Orders — last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentOrders, error: ordErr } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, customer_name, total_cents, currency, status, created_at")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  if (ordErr) {
    lines.push("ORDERS (last 7 days): [error — " + ordErr.message + "]");
  } else {
    const recent = (recentOrders as OrderRow[] | null) ?? [];
    lines.push(`ORDERS (last 7 days): ${recent.length} orders`);
    if (recent.length > 0) {
      const show = recent.slice(0, 5);
      for (const o of show) {
        const total =
          typeof o.total_cents === "number"
            ? (o.total_cents / 100).toFixed(2) + " " + (o.currency || "GMD")
            : "N/A";
        const date = o.created_at ? o.created_at.slice(0, 10) : "unknown";
        lines.push(
          `  ${o.order_number} | ${total} | ${o.status} | ${date} | ${o.customer_name || "—"}`
        );
      }
    }
  }

  // Orders — all time count
  const { count, error: countErr } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true });

  if (countErr) {
    lines.push("ORDERS (all time): [error — " + countErr.message + "]");
  } else {
    lines.push(`ORDERS (all time): ${count ?? 0} orders`);
  }

  return lines.join("\n");
}

export async function processAgentMessage(messageText: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "API key not configured.";
  }

  let storeData: string;
  try {
    storeData = await fetchStoreData();
  } catch (err) {
    console.error("[mugenOps] Failed to fetch store data:", err);
    storeData = "STORE DATA: unavailable — Supabase fetch failed.";
  }

  const systemPrompt = BASE_SYSTEM_PROMPT.replace(
    "[STORE DATA INJECTED HERE]",
    storeData
  );

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messageText },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)");
      console.error(
        `[mugenOps] Groq API error: status=${res.status} body=${errBody}`
      );
      return "MUGEN OPS offline. Check Vercel logs.";
    }

    const data = (await res.json()) as {
      choices?: Array<{ message: { content: string } }>;
    };

    return (
      data.choices?.[0]?.message?.content?.trim() ??
      "MUGEN OPS offline. Check Vercel logs."
    );
  } catch (err) {
    console.error("[mugenOps] Unexpected error:", err);
    return "MUGEN OPS offline. Check Vercel logs.";
  }
}
