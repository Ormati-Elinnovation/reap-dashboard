import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const svc = createClient(URL, SVC, { auth: { persistSession: false } });

async function asUser(email: string, password: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

async function main() {
  // setup a restricted user
  await svc.auth.admin.createUser({ email: "test@test.com", password: "test123", email_confirm: true }).catch(() => {});
  await svc.from("user_access").upsert({ email: "test@test.com", is_admin: false, all_companies: false, companies: ["Hodlr"], denied_cards: [] });

  const admin = await asUser("admin@admin.com", "admin");
  const all = await admin.from("user_access").select("email");
  console.log("ADMIN reads user_access rows:", all.data?.length, all.error ? `(err ${all.error.message})` : "");
  const w = await admin.from("user_access").upsert({ email: "demo@demo.com", is_admin: false, all_companies: false, companies: ["Rain"], denied_cards: [] });
  console.log("ADMIN write user_access:", w.error ? `BLOCKED (${w.error.message})` : "OK ✓");

  const test = await asUser("test@test.com", "test123");
  const ownRead = await test.from("user_access").select("email");
  console.log("NON-ADMIN sees user_access rows:", ownRead.data?.map((r) => r.email), "(expect only own)");
  const escalate = await test.from("user_access").update({ is_admin: true }).eq("email", "test@test.com");
  console.log("NON-ADMIN self-escalate to admin:", escalate.error ? `BLOCKED ✓ (${escalate.error.message})` : "NOT BLOCKED ✗ (data:" + JSON.stringify(escalate.data) + ")");
  // verify still not admin
  const chk = await svc.from("user_access").select("is_admin").eq("email", "test@test.com").maybeSingle();
  console.log("  test is_admin after attempt:", chk.data?.is_admin);

  // cleanup
  await svc.from("user_access").delete().in("email", ["demo@demo.com", "test@test.com"]);
  const { data: list } = await svc.auth.admin.listUsers();
  const u = list.users.find((x) => x.email === "test@test.com");
  if (u) await svc.auth.admin.deleteUser(u.id);
  console.log("cleanup done");
}
main().catch((e) => { console.error(e); process.exit(1); });
