import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });

const email = (process.argv[2] ?? "").toLowerCase();
const password = process.argv[3];
if (!email) {
  console.error("Usage: tsx scripts/set-admin.ts <email> [password]");
  process.exit(1);
}
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  if (password) {
    const { error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
    if (error && !/already been registered|already exists/i.test(error.message)) throw error;
    console.log(error ? `user exists (kept): ${email}` : `✓ login created: ${email}`);
  }
  const { error } = await svc
    .from("user_access")
    .upsert({ email, is_admin: true, all_companies: true }, { onConflict: "email" });
  if (error) throw error;
  console.log(`✓ ${email} is now admin (all companies)`);
}
main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
