import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  // before login: RLS should block (0 rows)
  const pre = await anon.from("transactions").select("id", { count: "exact", head: true });
  console.log("anon (logged-out) rows visible:", pre.count ?? 0, pre.error ? `(err: ${pre.error.message})` : "");

  // login like the browser
  const { error: le } = await anon.auth.signInWithPassword({
    email: "admin@admin.com",
    password: "admin",
  });
  if (le) {
    console.error("login failed:", le.message);
    process.exit(1);
  }
  const { count } = await anon.from("transactions").select("id", { count: "exact", head: true });
  console.log("authenticated rows visible:", count);

  // grand total via authenticated read (paginate)
  let grand = 0;
  let n = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await anon.from("transactions").select("amt").range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) grand += Number(r.amt);
    n += data.length;
    if (data.length < 1000) break;
  }
  console.log(`authenticated grand total: $${grand.toFixed(2)} over ${n} rows`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
