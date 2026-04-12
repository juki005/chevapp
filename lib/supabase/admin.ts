// ── Service-role Supabase client ─────────────────────────────────────────────
// Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row-Level Security.
// ONLY import this in server-side code (Server Actions, Route Handlers).
// Never expose the service role key to the browser.
//
// Required env var (add to Vercel → Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY = <your service role key from Supabase Dashboard>
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Returns a Supabase client with service-role privileges, or null if the
 *  env var is not configured (harvest will silently skip in that case). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient<Database>(url, key, {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
    },
    global: {
      // Prevent Next.js from caching supabase fetch calls made server-side
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
