"use server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSvc } from "@supabase/supabase-js";

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

// Creates the actual login account (auth user). Guarded — admins only.
export async function createLogin(
  email: string,
  password: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  if (!email || !password || password.length < 5)
    return { error: "אימייל/סיסמה לא תקינים (סיסמה 5+ תווים)" };
  const svc = createSvc(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { error } = await svc.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
