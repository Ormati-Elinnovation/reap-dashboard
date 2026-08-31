"use server";
import { createClient } from "@/lib/supabase/server";
import { generateKey, hashKey, keyPrefix } from "@/lib/api/keys";
import { serviceClient } from "@/lib/api/service";

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const email = user.email?.toLowerCase() ?? "";
  const { data } = await supabase.from("user_access").select("is_admin").eq("email", email).maybeSingle();
  return data?.is_admin ? email : null;
}

export type ApiKeyInput = {
  name: string;
  all_companies: boolean;
  companies: string[];
  denied_cards: string[];
  expires_at: string | null; // YYYY-MM-DD
};

// The plaintext key is returned exactly once — only its sha256 hash is stored.
export async function createApiKey(
  input: ApiKeyInput
): Promise<{ key?: string; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "אין הרשאה" };
  if (!input.name.trim()) return { error: "יש להזין שם למפתח" };
  if (!input.all_companies && input.companies.length === 0)
    return { error: "בחר לפחות חברה אחת (או סמן 'כל החברות')" };

  const key = generateKey();
  const { error } = await serviceClient().from("api_keys").insert({
    name: input.name.trim(),
    prefix: keyPrefix(key),
    key_hash: await hashKey(key),
    all_companies: input.all_companies,
    companies: input.all_companies ? [] : input.companies,
    denied_cards: input.denied_cards,
    expires_at: input.expires_at ? new Date(input.expires_at + "T23:59:59Z").toISOString() : null,
    created_by: admin,
  });
  if (error) return { error: error.message };
  return { key };
}

export async function updateApiKey(
  id: number,
  input: ApiKeyInput
): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  if (!input.name.trim()) return { error: "יש להזין שם למפתח" };
  const { error } = await serviceClient()
    .from("api_keys")
    .update({
      name: input.name.trim(),
      all_companies: input.all_companies,
      companies: input.all_companies ? [] : input.companies,
      denied_cards: input.denied_cards,
      expires_at: input.expires_at ? new Date(input.expires_at + "T23:59:59Z").toISOString() : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function setApiKeyActive(id: number, active: boolean): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  const { error } = await serviceClient().from("api_keys").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteApiKey(id: number): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  const { error } = await serviceClient().from("api_keys").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
