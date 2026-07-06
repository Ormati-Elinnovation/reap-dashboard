"use server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSvc, type SupabaseClient } from "@supabase/supabase-js";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_access")
    .select("is_admin")
    .eq("email", user.email?.toLowerCase() ?? "")
    .maybeSingle();
  return !!data?.is_admin;
}

function svc(): SupabaseClient {
  return createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function findUserId(client: SupabaseClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const u = data.users.find((x) => x.email === target);
    if (u) return u.id;
    if (data.users.length < 200) break;
  }
  return null;
}

// Create the login account (auth user). Admins only.
export async function createLogin(
  email: string,
  password: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  if (!email || !password || password.length < 5)
    return { error: "אימייל/סיסמה לא תקינים (סיסמה 5+ תווים)" };
  const { error } = await svc().auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

// Reset an existing user's password. Admins only.
export async function resetPassword(
  email: string,
  password: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  if (!email || !password || password.length < 5)
    return { error: "אימייל/סיסמה לא תקינים (סיסמה 5+ תווים)" };
  const client = svc();
  const id = await findUserId(client, email);
  if (!id) return { error: "למשתמש עדיין אין חשבון התחברות (צור התחברות תחילה)" };
  const { error } = await client.auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };
  return { ok: true };
}
