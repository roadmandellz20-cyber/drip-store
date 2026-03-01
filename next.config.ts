import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
const supabaseHost = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).hostname : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
