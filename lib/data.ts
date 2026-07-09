import type { SupabaseClient } from "@supabase/supabase-js";
import type { TechMap, Transaction } from "./types";

// Supabase/PostgREST caps a single response (default 1000 rows) — paginate.
export async function fetchAllTransactions(supabase: SupabaseClient): Promise<Transaction[]> {
  const PAGE = 1000;
  const out: Transaction[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id,date,month,ts,tid,company,card,holder,merchant,cat,amt,status,srv_group,tech_supplier,tech_group,department,manual")
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) out.push({ ...(r as Transaction), amt: Number(r.amt) });
    if (data.length < PAGE) break;
  }
  return out;
}

export async function fetchTechMap(supabase: SupabaseClient): Promise<TechMap> {
  const { data, error } = await supabase.from("tech_map").select("merchant,supplier,group");
  if (error) throw error;
  const map: TechMap = {};
  for (const r of data ?? []) map[r.merchant as string] = [r.supplier as string, r.group as string];
  return map;
}
