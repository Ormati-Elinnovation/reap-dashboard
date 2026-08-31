import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client: the public API authenticates by API key, not by a Supabase
// session, so RLS scoping is applied explicitly from the key's permissions.
export function serviceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
