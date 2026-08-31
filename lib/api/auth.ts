import { ApiFailure } from "./http";
import { hashKey } from "./keys";
import { serviceClient } from "./service";

export type ApiScope = {
  id: number;
  name: string;
  all_companies: boolean;
  companies: string[];
  denied_cards: string[];
};

// Accepts "Authorization: Bearer <key>", "x-api-key: <key>" or ?api_key= (last resort
// for integrations that cannot set headers — it lands in server logs, so prefer a header).
function extractKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const header = req.headers.get("x-api-key");
  if (header) return header.trim();
  const q = new URL(req.url).searchParams.get("api_key");
  return q ? q.trim() : null;
}

export async function authenticate(req: Request): Promise<ApiScope> {
  const key = extractKey(req);
  if (!key)
    throw new ApiFailure(401, "missing_api_key", "חסר מפתח API. שלח כותרת: Authorization: Bearer <key>");

  const client = serviceClient();
  const { data, error } = await client
    .from("api_keys")
    .select("id,name,all_companies,companies,denied_cards,active,expires_at,last_used_at")
    .eq("key_hash", await hashKey(key))
    .maybeSingle();

  if (error) throw new ApiFailure(500, "internal_error", "שגיאה באימות המפתח");
  if (!data) throw new ApiFailure(401, "invalid_api_key", "מפתח API לא תקין");
  if (!data.active) throw new ApiFailure(403, "key_disabled", "המפתח הושבת");
  if (data.expires_at && new Date(data.expires_at as string) < new Date())
    throw new ApiFailure(403, "key_expired", "תוקף המפתח פג");

  // Touch last_used_at at most once a minute — this runs on every request.
  const last = data.last_used_at ? new Date(data.last_used_at as string).getTime() : 0;
  if (Date.now() - last > 60_000)
    await client.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  return {
    id: data.id as number,
    name: data.name as string,
    all_companies: !!data.all_companies,
    companies: (data.companies as string[]) ?? [],
    denied_cards: (data.denied_cards as string[]) ?? [],
  };
}
