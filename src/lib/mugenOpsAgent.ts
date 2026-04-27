import { supabaseAdmin } from "@/lib/supabase-admin";

const MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 700;

const ALLOWED_PRODUCT_FIELDS = ["status", "is_new", "is_limited", "stock_qty", "brand_line"] as const;
type AllowedField = (typeof ALLOWED_PRODUCT_FIELDS)[number];

const VALID_STATUSES = ["AVAILABLE", "LIMITED", "ARCHIVED"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

// ─── Tools ────────────────────────────────────────────────────────────────────

async function tool_set_product_field(sku: string, field: string, value: string): Promise<string> {
  if (!ALLOWED_PRODUCT_FIELDS.includes(field as AllowedField)) {
    return `Error: '${field}' is not updatable. Allowed fields: ${ALLOWED_PRODUCT_FIELDS.join(", ")}.`;
  }

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("products")
    .select("slug")
    .eq("slug", sku)
    .single();

  if (fetchErr || !existing) {
    return `Error: SKU '${sku}' not found in Supabase.`;
  }

  let coerced: unknown = value;
  if (field === "is_new" || field === "is_limited") {
    coerced = value === "true" || value === "1";
  } else if (field === "stock_qty") {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0) return `Error: stock_qty must be a non-negative integer.`;
    coerced = n;
  } else if (field === "status") {
    const upper = value.toUpperCase();
    if (!VALID_STATUSES.includes(upper as ValidStatus)) {
      return `Error: status must be one of ${VALID_STATUSES.join(", ")}.`;
    }
    coerced = upper;
  }

  const { error: updateErr } = await supabaseAdmin
    .from("products")
    .update({ [field]: coerced })
    .eq("slug", sku);

  if (updateErr) return `Error updating ${field}: ${updateErr.message}`;

  const { data: updated } = await supabaseAdmin
    .from("products")
    .select("slug, title, status, is_limited, stock_qty, sold_qty, is_new, brand_line")
    .eq("slug", sku)
    .single();

  if (!updated) return `Done. ${sku} ${field} → ${coerced}.`;

  const p = updated as Record<string, unknown>;
  return `Done. ${sku} ${field} → ${coerced}. Current state: status=${p.status} | limited=${p.is_limited} | stock=${p.stock_qty ?? "unlimited"} | sold=${p.sold_qty} | new=${p.is_new}`;
}

async function tool_create_product(
  sku: string,
  name: string,
  price_gmd: string,
  status: string,
  is_limited: string,
  stock_qty: string,
  is_new: string,
  brand_line: string,
  description: string
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("slug")
    .eq("slug", sku)
    .maybeSingle();

  if (existing) return `Error: SKU '${sku}' already exists.`;

  const priceGmd = parseInt(price_gmd, 10);
  if (isNaN(priceGmd) || priceGmd <= 0) return `Error: price must be a positive integer in GMD.`;
  const priceCents = priceGmd * 100;

  const statusUpper = status.toUpperCase();
  if (!VALID_STATUSES.includes(statusUpper as ValidStatus)) {
    return `Error: status must be one of ${VALID_STATUSES.join(", ")}.`;
  }

  const isLimitedBool = is_limited === "true" || is_limited === "1";
  const isNewBool = is_new === "true" || is_new === "1";
  const stockQtyInt =
    stock_qty === "null" || stock_qty === "" ? null : parseInt(stock_qty, 10);

  if (isLimitedBool && (stockQtyInt === null || isNaN(stockQtyInt) || stockQtyInt < 0)) {
    return `Error: limited products require a valid stock_qty >= 0.`;
  }

  const { error } = await supabaseAdmin.from("products").insert({
    slug: sku,
    title: name,
    description: description || "",
    brand_line: brand_line || "ENTER THE MUGEN.",
    image_url: "",
    price_cents: priceCents,
    currency: "GMD",
    status: statusUpper,
    is_active: statusUpper !== "ARCHIVED",
    is_limited: isLimitedBool,
    stock_qty: isLimitedBool ? stockQtyInt : null,
    sold_qty: 0,
    is_new: isNewBool,
    sort_order: 0,
    details: [],
  });

  if (error) return `Error creating product: ${error.message}`;
  return `Done. '${name}' (${sku}) created. GMD ${priceGmd} | ${statusUpper} | limited=${isLimitedBool} | stock=${stockQtyInt ?? "unlimited"} | new=${isNewBool}`;
}

async function tool_archive_product(sku: string): Promise<string> {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("products")
    .select("slug, title")
    .eq("slug", sku)
    .single();

  if (fetchErr || !existing) return `Error: SKU '${sku}' not found.`;

  const { error } = await supabaseAdmin
    .from("products")
    .update({ status: "ARCHIVED", is_active: false })
    .eq("slug", sku);

  if (error) return `Error archiving: ${error.message}`;

  const p = existing as { slug: string; title: string };
  return `Done. '${p.title}' (${sku}) archived. status → ARCHIVED, is_active → false.`;
}

async function tool_set_launch_date(_isoDate: string): Promise<string> {
  return `No app_config table in Supabase. Launch date is controlled via NEXT_PUBLIC_LAUNCH_AT env var on Vercel. Update it there to change the drop date.`;
}

// ─── ACTION executor ──────────────────────────────────────────────────────────

async function executeAction(actionStr: string): Promise<string> {
  const parts = actionStr.split("|");
  const toolName = parts[0];

  try {
    switch (toolName) {
      case "tool_set_product_field":
        return await tool_set_product_field(parts[1] ?? "", parts[2] ?? "", parts[3] ?? "");
      case "tool_create_product":
        return await tool_create_product(
          parts[1] ?? "",
          parts[2] ?? "",
          parts[3] ?? "",
          parts[4] ?? "AVAILABLE",
          parts[5] ?? "false",
          parts[6] ?? "null",
          parts[7] ?? "false",
          parts[8] ?? "",
          parts[9] ?? ""
        );
      case "tool_archive_product":
        return await tool_archive_product(parts[1] ?? "");
      case "tool_set_launch_date":
        return await tool_set_launch_date(parts[1] ?? "");
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    console.error("[mugenOps] Tool error:", err);
    return `Tool error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

// ─── Store data fetch ─────────────────────────────────────────────────────────

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
        lines.push(
          `- ${p.slug} | ${p.title} | ${type} | stock: ${stock} | sold: ${p.sold_qty ?? 0} | status: ${p.status} | new: ${p.is_new ? "yes" : "no"}`
        );
      }
    }
  }

  lines.push("");

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
    for (const o of recent.slice(0, 5)) {
      const total =
        typeof o.total_cents === "number"
          ? (o.total_cents / 100).toFixed(2) + " " + (o.currency || "GMD")
          : "N/A";
      lines.push(
        `  ${o.order_number} | ${total} | ${o.status} | ${o.created_at.slice(0, 10)} | ${o.customer_name || "—"}`
      );
    }
  }

  const { count, error: countErr } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true });

  lines.push(
    countErr
      ? "ORDERS (all time): [error — " + countErr.message + "]"
      : `ORDERS (all time): ${count ?? 0} orders`
  );

  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────

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

What you can do in Phase 2 (write operations):
- Mark a product as new or not new: 'mark ichigo-01 as not new'
- Archive a product: 'archive the ulquiorra tee' or 'archive ulquiorra-01'
- Update stock quantity: 'set luffy-01 stock to 8'
- Change product status: 'set ichigo-01 to available'
- Create a new product: 'create a new product called X, SKU x-01, limited, 10 stock, GMD 2000'
- Set the drop date: 'set the drop date to May 15 midnight'

When executing write operations:
- Always confirm what you are about to do before doing it if the action is destructive (archive)
- After executing, confirm exactly what changed
- If a SKU is ambiguous, ask for clarification before writing
- Never update stock_qty to a negative number
- Never archive a product without confirming the SKU is correct first

After any write operation, always state:
- What was changed
- The current state of that product now
- Example: 'Done. ichigo-01 is_new set to false. Status: LIMITED, Stock: 10, Sold: 0.'

TOOL USE — ACTION FORMAT:
When you need to execute a write operation, include exactly one action tag in your response using this format:
[ACTION:tool_name|param1|param2|param3]

Available actions:
- Update a single product field: [ACTION:tool_set_product_field|sku|field|value]
  - Allowed fields: status, is_new, is_limited, stock_qty, brand_line
  - Examples:
    [ACTION:tool_set_product_field|ichigo-01|is_new|false]
    [ACTION:tool_set_product_field|luffy-01|stock_qty|8]
    [ACTION:tool_set_product_field|ichigo-01|status|AVAILABLE]

- Archive a product: [ACTION:tool_archive_product|sku]
  - Example: [ACTION:tool_archive_product|ulquiorra-01]

- Create a new product: [ACTION:tool_create_product|sku|name|price_gmd|status|is_limited|stock_qty|is_new|brand_line|description]
  - Example: [ACTION:tool_create_product|naruto-01|Naruto Sage Mode Tee|2000|LIMITED|true|10|true|ENTER THE MUGEN.|Limited archive piece]

- Set launch date (env var only — no DB table): [ACTION:tool_set_launch_date|2026-05-15T00:00:00Z]

Rules:
- Only include one [ACTION:...] tag per response
- Do not make up SKUs — only use SKUs visible in the store data
- Write the action tag on its own line at the end of your response
- The rest of your response should be your normal message to the owner

If asked to do something outside your capabilities, say exactly: 'That is outside my current capabilities.'

Always be precise with numbers. Never guess — only report what the data shows.

Current store data is injected below:

[STORE DATA INJECTED HERE]`;

// ─── Main entry point ─────────────────────────────────────────────────────────

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

async function callGroq(apiKey: string, messages: GroqMessage[]): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)");
    console.error(`[mugenOps] Groq error: ${res.status} ${errBody}`);
    return "MUGEN OPS offline. Check Vercel logs.";
  }

  const data = (await res.json()) as {
    choices?: Array<{ message: { content: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? "MUGEN OPS offline. Check Vercel logs.";
}

const ACTION_RE = /\[ACTION:([^\]]+)\]/;

export async function processAgentMessage(messageText: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "API key not configured.";

  let storeData: string;
  try {
    storeData = await fetchStoreData();
  } catch (err) {
    console.error("[mugenOps] Failed to fetch store data:", err);
    storeData = "STORE DATA: unavailable — Supabase fetch failed.";
  }

  const systemPrompt = BASE_SYSTEM_PROMPT.replace("[STORE DATA INJECTED HERE]", storeData);

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: messageText },
  ];

  try {
    const firstResponse = await callGroq(apiKey, messages);
    const actionMatch = ACTION_RE.exec(firstResponse);

    if (!actionMatch) {
      return firstResponse;
    }

    // Strip the action tag from the visible text
    const visibleText = firstResponse.replace(ACTION_RE, "").trim();
    const toolResult = await executeAction(actionMatch[1]);

    console.log(`[mugenOps] Action executed: ${actionMatch[1]} → ${toolResult}`);

    // Send tool result back for a clean confirmation response
    messages.push({ role: "assistant", content: firstResponse });
    messages.push({
      role: "user",
      content: `[TOOL RESULT]: ${toolResult}\n\nGive a short confirmation to the owner based on this result. No action tags.`,
    });

    const finalResponse = await callGroq(apiKey, messages);
    return visibleText ? `${visibleText}\n\n${finalResponse}` : finalResponse;
  } catch (err) {
    console.error("[mugenOps] Unexpected error:", err);
    return "MUGEN OPS offline. Check Vercel logs.";
  }
}
