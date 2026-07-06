import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
const file = process.argv[2] ?? "supabase/migrations/0001_init.sql";
if (!url) {
  console.error("Usage: DATABASE_URL=<uri> tsx scripts/migrate.ts [migration.sql]");
  process.exit(1);
}

async function main() {
  const sql = readFileSync(resolve(file), "utf-8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log(`✓ applied ${file}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
