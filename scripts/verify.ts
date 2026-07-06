import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyServer, classifyTech } from "../lib/classification";
import type { TechMap, Transaction } from "../lib/types";

const techMap = JSON.parse(readFileSync(resolve("data", "tech_map.json"), "utf-8")) as TechMap;
const raw = JSON.parse(readFileSync(resolve("data", "tx_all.json"), "utf-8")) as Transaction[];

let grand = 0;
const srv: Record<string, number> = {};
const tech: Record<string, number> = {};
const holders = new Set<string>();
const cards = new Set<string>();
const merchants = new Set<string>();
const cats = new Set<string>();
const monthsSet = new Set<string>();

for (const t of raw) {
  const amt = Math.round(t.amt * 100) / 100;
  grand += amt;
  holders.add(t.holder.toLowerCase() === "omri" ? "Omri" : t.holder);
  cards.add(t.card);
  merchants.add(t.merchant);
  if (t.cat) cats.add(t.cat);
  monthsSet.add(t.month ?? t.date.slice(0, 7));
  const s = classifyServer(t.merchant);
  if (s) srv[s] = (srv[s] || 0) + amt;
  const tc = classifyTech(t.merchant, techMap);
  if (tc) tech[tc.group] = (tech[tc.group] || 0) + amt;
}

const round = (n: number) => Math.round(n * 100) / 100;
const techTot = Object.values(tech).reduce((a, b) => a + b, 0);
const srvTot = Object.values(srv).reduce((a, b) => a + b, 0);

console.log("rows:", raw.length);
console.log("grand:", round(grand));
console.log("holders:", holders.size, "cards:", cards.size, "merchants:", merchants.size, "cats:", cats.size, "months:", [...monthsSet].sort());
console.log("servers:", Object.fromEntries(Object.entries(srv).map(([k, v]) => [k, round(v)])), "total", round(srvTot));
console.log("technology total:", round(techTot));
console.log("tech by group:", Object.fromEntries(Object.entries(tech).map(([k, v]) => [k, round(v)])));
