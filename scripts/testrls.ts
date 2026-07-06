import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const svc = createClient(URL, SVC, { auth: { persistSession: false } });

async function visibleSummary(email: string, password: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  const rows: { company: string; card: string; amt: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await c.from("transactions").select("company,card,amt").range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as typeof rows));
    if (data.length < 1000) break;
  }
  const companies = [...new Set(rows.map((r) => r.company))].sort();
  const cards = [...new Set(rows.map((r) => r.card))].sort();
  return { count: rows.length, companies, cards };
}

async function main() {
  // create restricted test user
  await svc.auth.admin
    .createUser({ email: "test@test.com", password: "test123", email_confirm: true })
    .catch(() => {});
  await svc.from("user_access").upsert({
    email: "test@test.com",
    is_admin: false,
    all_companies: false,
    companies: ["Rain"],
    denied_cards: ["1564"],
  });

  const admin = await visibleSummary("admin@admin.com", "admin");
  console.log("ADMIN → rows:", admin.count, "companies:", admin.companies.length, "cards:", admin.cards.length);

  const test = await visibleSummary("test@test.com", "test123");
  console.log("TEST  → rows:", test.count, "companies:", test.companies, "cards:", test.cards);
  console.log("  card 1564 hidden?", !test.cards.includes("1564"));
  console.log("  only Rain?", test.companies.length === 1 && test.companies[0] === "Rain");

  // cleanup
  await svc.from("user_access").delete().eq("email", "test@test.com");
  const { data: list } = await svc.auth.admin.listUsers();
  const u = list.users.find((x) => x.email === "test@test.com");
  if (u) await svc.auth.admin.deleteUser(u.id);
  console.log("cleanup done");
}
main().catch((e) => { console.error(e); process.exit(1); });
