import "server-only";
import { createClient } from "@supabase/supabase-js";

function pick(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value && value.trim().length > 0) return value;
  }
  return "";
}

const url = pick(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRole = pick(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = pick(process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!url || (!serviceRole && !anon)) {
  throw new Error(
    "Missing Supabase env. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (preferred) or fallback anon key vars."
  );
}

export const supabaseAdmin = createClient(url, serviceRole || anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
