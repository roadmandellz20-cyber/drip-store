import "server-only";
import { createClient } from "@supabase/supabase-js";

function readEnv(name: string) {
  return process.env[name];
}

function getLegacyEnv(name: "URL" | "ANON_KEY") {
  const suffix = name === "URL" ? "URL" : "ANON_KEY";
  return readEnv(`NEXT_PUBLIC_SUPABASE_${suffix}`);
}

export function getSupabaseServerConfig() {
  const url = readEnv("SUPABASE_URL") || getLegacyEnv("URL") || "";
  const key = readEnv("SUPABASE_ANON_KEY") || getLegacyEnv("ANON_KEY") || "";
  return { url, key };
}

function requireSupabaseServerConfig() {
  const { url, key } = getSupabaseServerConfig();
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env. Set SUPABASE_URL/SUPABASE_ANON_KEY (preferred) or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, key };
}

const { url, key } = requireSupabaseServerConfig();

export const supabaseServer = createClient(url, key);
