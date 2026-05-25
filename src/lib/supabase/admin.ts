import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, supabaseAdminEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

/**
 * Service-role client. BYPASSES RLS. Use ONLY in trusted server code that has
 * already validated/authorized the operation: public chat & inquiry endpoints,
 * Stripe/Twilio webhooks, and admin tooling. Never expose to the browser and
 * never key its behavior off unvalidated client input.
 */
export function createAdminClient() {
  const pub = publicEnv();
  const srv = supabaseAdminEnv();
  return createSupabaseClient<Database>(
    pub.NEXT_PUBLIC_SUPABASE_URL,
    srv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
