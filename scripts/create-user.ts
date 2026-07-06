import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const email = process.argv[2] ?? process.env.ADMIN_EMAIL;
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;

if (!URL || !SERVICE) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}
if (!email || !password) {
  console.error("Usage: tsx scripts/create-user.ts <email> <password>");
  process.exit(1);
}

async function main() {
  const supabase = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("✗", error.message);
    process.exit(1);
  }
  console.log("✓ user created:", data.user?.email);
}

main();
