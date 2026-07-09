"use server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSvc, type SupabaseClient } from "@supabase/supabase-js";
import { classifyServer, classifyTech } from "@/lib/classification";
import type { TechMap } from "@/lib/types";

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

export type ManualInput = {
  date: string;
  company: string;
  merchant: string;
  cat: string;
  department: string;
  amt: number;
};

export async function addManual(input: ManualInput): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  const { date, company, merchant, cat, department } = input;
  const amt = Number(input.amt);
  if (!date || !company || !merchant.trim() || !isFinite(amt) || amt === 0)
    return { error: "חסרים שדות חובה (תאריך, חברה, ספק, סכום)" };

  const client = svc();
  const { data: tm } = await client.from("tech_map").select("merchant,supplier,group");
  const techMap: TechMap = {};
  for (const r of tm ?? []) techMap[r.merchant as string] = [r.supplier as string, r.group as string];
  const tech = classifyTech(merchant.trim(), techMap);

  const row = {
    date,
    month: date.slice(0, 7),
    ts: date,
    tid: "manual",
    company,
    card: "חיצוני",
    holder: "ידני",
    merchant: merchant.trim(),
    cat: cat || null,
    amt: Math.round(amt * 100) / 100,
    status: "CLEARED",
    srv_group: classifyServer(merchant.trim()),
    tech_supplier: tech?.supplier ?? null,
    tech_group: tech?.group ?? null,
    department: department || null,
    manual: true,
  };
  const { error } = await client.from("transactions").insert(row);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteManual(id: number): Promise<{ ok?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { error: "אין הרשאה" };
  const { error } = await svc().from("transactions").delete().eq("id", id).eq("manual", true);
  if (error) return { error: error.message };
  return { ok: true };
}
