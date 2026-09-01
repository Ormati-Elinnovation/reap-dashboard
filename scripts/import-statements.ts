/**
 * Import Reap CSV exports (one file per entity) into transactions.
 *
 *   npx tsx scripts/import-statements.ts "reap-transactions-2026-08-30*.csv"
 *   npx tsx scripts/import-statements.ts --commit <files...>
 *
 * Dry-run by default; pass --commit to write.
 *
 * Reap has two export shapes and they do NOT mean the same thing by "date":
 *
 *   "transactions"  (Date (UTC) / Charged amount / Card Transaction ID)
 *       Date (UTC) is the real transaction time and Amount is in the merchant's own
 *       currency — the USD figure lives in Charged amount. This is the shape the
 *       original Mar–Jun data came from, so it is the reference for everything else.
 *
 *   "card-statement" (Date / Amount / Transaction ID)
 *       Amount is already USD, but Date is the *clearing* date (transaction date only
 *       while a row is still pending): cleared rows arrive in batches a few dozen
 *       timestamps wide. The file's own window is by transaction date, so every row in
 *       it belongs to the statement's month even when it cleared a day or two into the
 *       next one. Month therefore comes from the filename, not from the date column.
 *
 * Shared conventions, replicated from the existing data:
 *  - company is derived from the last 4 digits; each file must resolve to exactly one
 *  - holder names are normalized to the name already used for that card
 *  - DECLINED rows are dropped (the dashboard only tracks money that moved)
 *  - REPAYMENT / blank-cardholder rows are dropped (settlements, not expenses)
 *  - refunds keep their negative amount so they net against the charge they reverse
 *  - rows are skipped if their transaction id is already stored, or if an identical
 *    date+card+merchant+amount row already exists (guards against the pre-CSV seed data).
 *    Re-running is therefore safe.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { classifyServer, classifyTech } from "../lib/classification";
import type { TechMap } from "../lib/types";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(URL, SERVICE, { auth: { persistSession: false } });

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
const FILES = argv.filter((a) => !a.startsWith("--"));
if (FILES.length === 0) {
  console.error("Usage: tsx scripts/import-statements.ts [--commit] <csv...>");
  process.exit(1);
}

// ---- minimal RFC4180 CSV parser (fields are quoted, may contain commas) ----
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f !== ""));
}

type Row = {
  date: string;        // YYYY-MM-DD, as reported by the file
  time: string;        // HH:MM:SS
  month: string;       // the month this row is attributed to
  status: string;      // normalized to upper case
  holder: string;
  merchant: string;
  cat: string;
  amt: number;         // USD
  card: string;
  tid: string;
};

const CARD_STATEMENT = "Transaction ID";
const TRANSACTIONS = "Card Transaction ID";

// Reap writes "CLEARED" in one export and "Cleared" in the other.
const upper = (s: string) => s.trim().toUpperCase();

function readCsv(path: string): { rows: Row[]; shape: string } {
  const [head, ...body] = parseCsv(readFileSync(path, "utf-8").replace(/^\ufeff/, ""));
  const recs = body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])) as Record<string, string>);

  if (head.includes(TRANSACTIONS)) {
    return {
      shape: "transactions",
      rows: recs.map((r) => {
        const [date, time] = r["Date (UTC)"].split(" ");
        return {
          date,
          time: time ?? "",
          month: date.slice(0, 7),
          status: upper(r.Status),
          holder: r["Cardholder Name"],
          merchant: r.Merchant,
          cat: r.Category,
          amt: Number(r["Charged amount"]), // Amount is the merchant-currency figure
          card: r["Last 4"],
          tid: r[TRANSACTIONS].trim(),
        };
      }),
    };
  }

  // card-statement: the window is by transaction date, so the filename fixes the month.
  const stamped = /(\d{4}-\d{2})-\d{2}-to-/.exec(path) ?? /\/(\d{4}-\d{2})\//.exec(path);
  if (!stamped) {
    console.error(`\u2717 ${path}: cannot tell which month this card-statement covers.\n` +
      "  Keep the original name (card-statement-YYYY-MM-DD-to-...) or file it under data/statements/YYYY-MM/.");
    process.exit(1);
  }
  return {
    shape: "card-statement",
    rows: recs.map((r) => ({
      date: r.Date.slice(0, 10),
      time: r.Date.slice(11, 19),
      month: stamped[1],
      status: upper(r.Status),
      holder: r.Cardholder,
      merchant: r.Merchant,
      cat: r.Category,
      amt: Number(r.Amount), // already USD
      card: r["Card (Last 4)"],
      tid: r["Transaction ID"].trim(),
    })),
  };
}

async function fetchAll<T>(cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("transactions").select(cols).range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as unknown as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function main() {
  // ---- learn card -> (company, holder) and known holder names from history ----
  const known = await fetchAll<{ card: string; company: string; holder: string; tid: string | null; status: string | null; manual: boolean | null }>("card,company,holder,tid,status,manual");
  const cardCompany = new Map<string, string>();
  const cardHolder = new Map<string, string>();
  const holderNames = new Set<string>();
  for (const r of known) {
    if (r.manual) continue;
    cardCompany.set(r.card, r.company);
    cardHolder.set(r.card, r.holder);
    holderNames.add(r.holder);
  }
  // Keyed by id+status: a refund carries the same id as the charge it reverses.
  const seenTids = new Set(known.filter((r) => r.tid).map((r) => `${r.tid}|${r.status ?? ""}`));

  // Content fingerprints of what is already stored. The Mar–Jun rows predate these CSVs and
  // carry unrelated ids, so tid alone cannot detect an overlap with them. Counted, not a set,
  // so a genuine same-day repeat charge still imports.
  const stored = await fetchAll<{ date: string; card: string; merchant: string; amt: number }>("date,card,merchant,amt");
  const fingerprint = (date: string, card: string, merchant: string, amt: number) =>
    `${date}|${card}|${merchant}|${amt.toFixed(2)}`;
  const seenRows = new Map<string, number>();
  for (const r of stored) {
    const k = fingerprint(String(r.date), r.card, r.merchant, Number(r.amt));
    seenRows.set(k, (seenRows.get(k) ?? 0) + 1);
  }

  const { data: tmRows, error: tmErr } = await supabase.from("tech_map").select("merchant,supplier,group");
  if (tmErr) throw tmErr;
  const techMap: TechMap = {};
  for (const r of tmRows ?? []) techMap[r.merchant as string] = [r.supplier as string, r.group as string];

  // Unknown card: reuse the existing spelling of that person's name when we can.
  const byLower = new Map([...holderNames].map((h) => [h.toLowerCase(), h]));
  function normalizeHolder(card: string, raw: string): string {
    const mapped = cardHolder.get(card);
    if (mapped) return mapped;
    return byLower.get(raw.toLowerCase()) ?? byLower.get(raw.split(/\s+/)[0].toLowerCase()) ?? raw;
  }

  const rows: Record<string, unknown>[] = [];
  const report: string[] = [];
  const newCards: string[] = [];
  const byMonth = new Map<string, { n: number; sum: number }>();

  for (const file of FILES) {
    const { rows: recs, shape } = readCsv(file);
    const carded = recs.filter((r) => r.card.trim());
    const settlements = recs.length - carded.length;

    // company = the single company all recognized cards in this file belong to
    const companies = new Set(carded.map((r) => cardCompany.get(r.card)).filter(Boolean) as string[]);
    if (companies.size !== 1) {
      console.error(`✗ ${file}: cards resolve to ${companies.size} companies (${[...companies].join(", ") || "none"}) — cannot assign an entity.`);
      process.exit(1);
    }
    const company = [...companies][0];

    const declined = carded.filter((r) => r.status === "DECLINED").length;
    const live = carded.filter((r) => r.status !== "DECLINED");

    let dupes = 0;
    let sum = 0;
    let taken = 0;
    let refunds = 0;
    const months = new Map<string, number>();
    for (const r of live) {
      const amt = Math.round(r.amt * 100) / 100;
      if (!Number.isFinite(amt)) {
        console.error(`✗ ${file}: row ${r.tid} has no usable USD amount.`);
        process.exit(1);
      }

      // A refund shares its id with the charge it reverses, so the id alone is not unique here.
      const idKey = `${r.tid}|${r.status}`;
      if (r.tid && seenTids.has(idKey)) { dupes++; continue; }
      const fp = fingerprint(r.date, r.card, r.merchant, amt);
      const already = seenRows.get(fp) ?? 0;
      if (already > 0) { seenRows.set(fp, already - 1); dupes++; continue; }
      if (r.tid) seenTids.add(idKey);

      if (!cardCompany.has(r.card) && !newCards.includes(`${r.card} (${r.holder}) → ${company}`)) {
        newCards.push(`${r.card} (${r.holder}) → ${company}`);
      }
      if (amt < 0) refunds++;
      const tech = classifyTech(r.merchant, techMap);
      sum += amt;
      taken++;
      months.set(r.month, (months.get(r.month) ?? 0) + 1);
      const agg = byMonth.get(r.month) ?? { n: 0, sum: 0 };
      agg.n++; agg.sum += amt;
      byMonth.set(r.month, agg);
      rows.push({
        date: r.date,
        month: r.month,
        ts: `${r.date} ${r.time}`,
        tid: r.tid,
        company,
        card: r.card,
        holder: normalizeHolder(r.card, r.holder),
        merchant: r.merchant,
        cat: r.cat || null,
        amt,
        status: r.status,
        srv_group: classifyServer(r.merchant),
        tech_supplier: tech?.supplier ?? null,
        tech_group: tech?.group ?? null,
      });
    }
    const spread = [...months.entries()].sort().map(([m, n]) => `${m}:${n}`).join(" ");
    report.push(
      `  ${company.padEnd(12)} ${String(taken).padStart(4)} rows  ${money(sum).padStart(14)}   [${spread}]  ${shape}` +
        `\n    ← ${file}   (skipped: ${declined} declined, ${settlements} settlement, ${dupes} already stored` +
        `${refunds ? `; includes ${refunds} refund${refunds > 1 ? "s" : ""}` : ""})`
    );
  }

  console.log(`\nimport — ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);
  console.log(report.join("\n"));
  console.log(`\n  TOTAL ${String(rows.length).padStart(4)} rows  ${money(rows.reduce((s, r) => s + (r.amt as number), 0))}`);
  console.log("\n  lands in:");
  for (const [m, v] of [...byMonth.entries()].sort()) console.log(`    ${m}  ${String(v.n).padStart(4)} rows  ${money(v.sum).padStart(14)}`);
  if (newCards.length) console.log(`\n  new cards seen (assigned by file):\n    ${newCards.join("\n    ")}`);

  if (!COMMIT) { console.log("\n(dry run — re-run with --commit to write)\n"); return; }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("transactions").insert(rows.slice(i, i + 500));
    if (error) throw error;
    process.stdout.write(`\rinserted ${Math.min(i + 500, rows.length)}/${rows.length}`);
  }
  console.log(`\n✓ ${rows.length} rows inserted\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
