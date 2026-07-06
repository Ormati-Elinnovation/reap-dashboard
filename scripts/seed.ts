import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { classifyServer, classifyTech } from "../lib/classification";
import type { TechMap, Transaction } from "../lib/types";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE, { auth: { persistSession: false } });
const RESET = process.argv.includes("--reset");

function load<T>(f: string): T {
  return JSON.parse(readFileSync(resolve("data", f), "utf-8")) as T;
}

async function main() {
  const techMap = load<TechMap>("tech_map.json");
  const raw = load<Transaction[]>("tx_all.json");

  // normalize + classify
  const rows = raw.map((t) => {
    const holder = t.holder.toLowerCase() === "omri" ? "Omri" : t.holder;
    const tech = classifyTech(t.merchant, techMap);
    return {
      date: t.date,
      month: t.month ?? t.date.slice(0, 7),
      ts: t.ts ?? null,
      tid: t.tid ?? null,
      company: t.company,
      card: t.card,
      holder,
      merchant: t.merchant,
      cat: t.cat ?? null,
      amt: Math.round(t.amt * 100) / 100,
      status: t.status ?? null,
      srv_group: classifyServer(t.merchant),
      tech_supplier: tech?.supplier ?? null,
      tech_group: tech?.group ?? null,
    };
  });

  // preflight: does the table exist?
  const { error: probe } = await supabase.from("transactions").select("id").limit(1);
  if (probe && /does not exist|Could not find the table|schema cache/i.test(probe.message)) {
    console.error(
      "\n✗ Table public.transactions not found.\n" +
        "  Apply the schema first: paste supabase/migrations/0001_init.sql into the\n" +
        "  Supabase SQL editor (Dashboard → SQL Editor → New query → Run), then re-run this seed.\n"
    );
    process.exit(2);
  }

  if (RESET) {
    await supabase.from("transactions").delete().gte("id", 0);
    await supabase.from("tech_map").delete().neq("merchant", "");
    console.log("reset: cleared transactions + tech_map");
  }

  // tech_map
  const techRows = Object.entries(techMap).map(([merchant, [supplier, group]]) => ({
    merchant,
    supplier,
    group,
  }));
  const { error: tmErr } = await supabase.from("tech_map").upsert(techRows, { onConflict: "merchant" });
  if (tmErr) throw tmErr;
  console.log(`tech_map: ${techRows.length} rows`);

  // transactions in batches
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("transactions").insert(batch);
    if (error) throw error;
    process.stdout.write(`\rinserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");

  // verification
  const grand = rows.reduce((s, r) => s + r.amt, 0);
  const srv: Record<string, number> = {};
  const tech: Record<string, number> = {};
  for (const r of rows) {
    if (r.srv_group) srv[r.srv_group] = (srv[r.srv_group] || 0) + r.amt;
    if (r.tech_group) tech[r.tech_group] = (tech[r.tech_group] || 0) + r.amt;
  }
  const techTot = Object.values(tech).reduce((a, b) => a + b, 0);
  console.log(`\n✓ ${rows.length} rows inserted · grand $${grand.toFixed(2)}`);
  console.log("servers:", Object.fromEntries(Object.entries(srv).map(([k, v]) => [k, +v.toFixed(2)])));
  console.log(`technology total $${techTot.toFixed(2)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
