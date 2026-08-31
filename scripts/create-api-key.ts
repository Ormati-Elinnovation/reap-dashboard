// Create a read-only API key from the CLI:
//   npx tsx scripts/create-api-key.ts "שם המפתח" [--companies=Rain,Hodlr] [--deny-cards=1234] [--expires=2027-01-01]
// Prints the key once — store it immediately.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateKey, hashKey, keyPrefix } from "../lib/api/keys";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));
const opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const listOpt = (k: string) => (opt(k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

if (!name) {
  console.error('Usage: npx tsx scripts/create-api-key.ts "<name>" [--companies=A,B] [--deny-cards=1,2] [--expires=YYYY-MM-DD]');
  process.exit(1);
}

async function main() {
  const companies = listOpt("companies");
  const key = generateKey();
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { error } = await client.from("api_keys").insert({
    name,
    prefix: keyPrefix(key),
    key_hash: await hashKey(key),
    all_companies: companies.length === 0,
    companies,
    denied_cards: listOpt("deny-cards"),
    expires_at: opt("expires") ? new Date(opt("expires") + "T23:59:59Z").toISOString() : null,
    created_by: "cli",
  });
  if (error) throw new Error(error.message);
  console.log(`\n✓ key created: ${name}`);
  console.log(`  companies: ${companies.length ? companies.join(", ") : "all"}`);
  console.log(`\n  ${key}\n`);
  console.log("  Store it now — it is not recoverable.\n");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
