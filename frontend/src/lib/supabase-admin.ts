import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client, server-only.
 *
 * The service_role key bypasses RLS entirely, so NEVER import this from any
 * file that ends up in the browser bundle. The `server-only` import above is
 * the belt — the module is also kept out of any `"use client"` files as the
 * suspenders.
 *
 * We lazy-construct on first call so build-time env (`next build`) doesn't
 * crash when the env vars aren't present; the client is cached as a
 * module-level singleton after the first call.
 */

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local (server-only — do NOT prefix with NEXT_PUBLIC_).",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "osscar-web-api" } },
  });
  return client;
}
